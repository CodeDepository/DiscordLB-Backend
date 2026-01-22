import { nadeoGet } from "../../api/nadeoClient.js";
import { tmxIdToMapUid } from "../../api/tmx.js";
import { getMapLeaderboardPage } from "../../api/mapLeaderboard.js";
import { tmxGetMapInfoById, tmxThumbnailUrl } from "../../api/tmxInfo.js";

import { getZones } from "../../api/tmCampaign.js";
import { buildDescendantZoneSet } from "../../zonesUtil.js";
import { resolveDisplayNames } from "../../api/displayNames.js";

/**
 * Cache
 */
const CACHE_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map(); // key -> { expiresAt, value }

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  cache.set(key, { expiresAt: Date.now() + CACHE_MS, value });
}

/**
 * Limits / safety
 * IMPORTANT: MAX_RESULTS caps the number of Indian players returned (what you want).
 */
const MAX_RESULTS = Number(process.env.MAX_RESULTS || 100); // ✅ always return at most 100
const NAME_CHUNK = Number(process.env.NAME_RESOLVE_CHUNK || 200);

const SCAN_CHUNK = Number(process.env.LEADERBOARD_SCAN_CHUNK || 100); // world fetch size per call
const MAX_WORLD_SCAN = Number(process.env.MAX_WORLD_SCAN || 10000); // world rank scan cap

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getMapLeaderboardPageWithRetry(mapUid, offset, length, tries = 4) {
  let lastErr = null;

  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await getMapLeaderboardPage(mapUid, offset, length);
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || e);

      const transient =
        msg.includes("502") ||
        msg.includes("503") ||
        msg.includes("504") ||
        msg.toLowerCase().includes("bad gateway");

      if (!transient) throw e;

      const wait = Math.min(3000, 200 * Math.pow(2, attempt));
      await sleep(wait);
    }
  }

  throw lastErr;
}

async function resolveNamesInChunks(accountIds, chunkSize = 200) {
  const out = {};
  for (let i = 0; i < accountIds.length; i += chunkSize) {
    const chunk = accountIds.slice(i, i + chunkSize);
    try {
      const part = await resolveDisplayNames(chunk);
      if (part && typeof part === "object") Object.assign(out, part);
    } catch {
      // ignore chunk failures
    }
  }
  return out;
}

async function fetchMapMetadata(tmxId, mapUid) {
  let mapName = null;
  let authorName = null;
  let authorTime = null;

  // TMX metadata
  try {
    const tmx = await tmxGetMapInfoById(tmxId);
    mapName = tmx?.Name || tmx?.name || mapName;
    authorName = tmx?.Username || tmx?.AuthorName || tmx?.Author || authorName;
  } catch {}

  // Nadeo metadata (authorTime + fallback name)
  try {
    const url = `https://live-services.trackmania.nadeo.live/api/token/map/${encodeURIComponent(mapUid)}`;
    const r = await nadeoGet({ tokenKey: "nadeo_live", url });
    if (r.ok) {
      authorTime = r.json?.authorTime ?? null;
      mapName = mapName || r.json?.name || null;
    }
  } catch {}

  return {
    mapName,
    authorName,
    authorTime,
    thumbnail: tmxThumbnailUrl(tmxId),
  };
}

export async function fetchIndiaTop10ForTmxMap(
  tmxId,
  targetCountry,
  { page = 1, pageSize = 100 } = {}
) {
  // ✅ We still allow paging, but we cap it to MAX_RESULTS
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(MAX_RESULTS, Math.max(10, Number(pageSize) || 100));

  const startIndex = (safePage - 1) * safePageSize;
  const endIndex = startIndex + safePageSize;

  // cache key includes paging + limits
  const cacheKey = `map_country_lb:${targetCountry}:${tmxId}:max${MAX_RESULTS}:p${safePage}:s${safePageSize}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // 1) TMX id -> mapUid
  const mapUid = await tmxIdToMapUid(tmxId);

  // 2) metadata
  const meta = await fetchMapMetadata(tmxId, mapUid);

  // 3) zones -> targetCountry + descendants
  const zones = await getZones();
  const { zoneIds } = buildDescendantZoneSet(zones, targetCountry);
  const normalizedZoneIds = new Set([...zoneIds].map((z) => String(z)));

  /**
   * 4) scan world leaderboard until we have enough UNIQUE country players
   * FIX: de-dupe by accountId so you never get repeated last players.
   */
  const found = [];
  const seen = new Set(); // ✅ FIX: prevents duplicates
  let exhausted = false;

  // how many unique results we need to fulfill this page (but never above MAX_RESULTS)
  const needed = Math.min(endIndex, MAX_RESULTS);

  for (let offset = 0; offset < MAX_WORLD_SCAN; ) {
    const data = await getMapLeaderboardPageWithRetry(mapUid, offset, SCAN_CHUNK);
    const rows = data?.tops?.[0]?.top || [];

    if (!rows.length) {
      exhausted = true;
      break;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row?.accountId || row?.score == null || row?.zoneId == null) continue;
      if (!normalizedZoneIds.has(String(row.zoneId))) continue;

      // ✅ FIX: skip duplicates
      if (seen.has(row.accountId)) continue;
      seen.add(row.accountId);

      found.push({
        accountId: row.accountId,
        timeOrScore: Number(row.score),
        positionWorld: offset + i + 1,
        recordTs: row.timestamp ?? row.scoreTimestamp ?? row.recordTimestamp ?? null,
      });

      if (found.length >= needed) break;
    }

    if (found.length >= needed) break;

    // move forward
    offset += rows.length;
  }

  // page slice (if map has < needed, slice just returns what's available)
  const pageRows = found.slice(startIndex, endIndex);

  // resolve names only for this page
  const ids = pageRows.map((x) => x.accountId);
  const nameMap = await resolveNamesInChunks(ids, NAME_CHUNK);

  const top10 = pageRows.map((x) => ({
    ...x,
    displayName: nameMap?.[x.accountId] || x.accountId,
  }));

  // hasMore means: there might be more unique results beyond this page
  const hasMore =
    found.length >= endIndex &&
    endIndex < MAX_RESULTS &&
    !exhausted;

  const result = {
    tmxId,
    mapUid,
    country: targetCountry,

    ...meta,

    page: safePage,
    pageSize: safePageSize,
    startIndex,
    returned: top10.length,
    maxResults: MAX_RESULTS,
    hasMore,

    top10,
  };

  cacheSet(cacheKey, result);
  return result;
}

export async function fetchMapInfoByTmxId(tmxId) {
  const mapUid = await tmxIdToMapUid(tmxId);

  const tmx = await tmxGetMapInfoById(tmxId);

  let nadeo = null;
  try {
    const url = `https://live-services.trackmania.nadeo.live/api/token/map/${encodeURIComponent(mapUid)}`;
    const r = await nadeoGet({ tokenKey: "nadeo_live", url });
    if (r.ok) nadeo = r.json;
  } catch {}

  return {
    tmxId,
    mapUid,
    thumbnail: tmxThumbnailUrl(tmxId),
    tmx,
    nadeo,
  };
}
