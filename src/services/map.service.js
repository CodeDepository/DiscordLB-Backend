// import { nadeoGet } from "../../api/nadeoClient.js";

// import { tmxIdToMapUid } from "../../api/tmx.js";
// import { getMapLeaderboardPage } from "../../api/mapLeaderboard.js";
// import { tmxGetMapInfoById, tmxThumbnailUrl } from "../../api/tmxInfo.js";

// import { getZones } from "../../api/tmCampaign.js";
// import { buildDescendantZoneSet } from "../../zonesUtil.js";
// import { resolveDisplayNames } from "../../api/displayNames.js";

// // Optional small in-memory cache to reduce repeated calls
// const CACHE_MS = 60 * 60 * 1000; // 1 hour
// const cache = new Map(); // key -> { expiresAt, value }

// function cacheGet(key) {
//   const hit = cache.get(key);
//   if (!hit) return null;
//   if (Date.now() > hit.expiresAt) {
//     cache.delete(key);
//     return null;
//   }
//   return hit.value;
// }

// function cacheSet(key, value) {
//   cache.set(key, { expiresAt: Date.now() + CACHE_MS, value });
// }

// export async function fetchIndiaTop10ForTmxMap(tmxId, targetCountry) {
//   const cacheKey = `map_india_top10:${targetCountry}:${tmxId}`;
//   const cached = cacheGet(cacheKey);
//   if (cached) return cached;

//   // 1) TMX id -> mapUid
//   const mapUid = await tmxIdToMapUid(tmxId);

//   // 2) Map metadata (TMX + Nadeo)
//   let mapName = null;
//   let authorName = null;
//   let authorTime = null;

//   // TMX info (name + author)
//   try {
//     const tmx = await tmxGetMapInfoById(tmxId);
//     mapName = tmx?.Name || tmx?.name || mapName;
//     authorName = tmx?.Username || tmx?.AuthorName || tmx?.Author || authorName;
//   } catch {
//     // ignore TMX failures
//   }

//   // Nadeo map info (author time etc.)
//   try {
//     const infoUrl = `https://live-services.trackmania.nadeo.live/api/token/map/${encodeURIComponent(
//       mapUid
//     )}`;
//     const info = await nadeoGet({ tokenKey: "nadeo_live", url: infoUrl });
//     if (info.ok) {
//       authorTime = info.json?.authorTime ?? null;
//       mapName = mapName || info.json?.name || null;
//     }
//   } catch {
//     // ignore Nadeo failures
//   }

//   const thumbnail = tmxThumbnailUrl(tmxId);

//   // 3) zones -> India + descendants (normalize to string)
//   const zones = await getZones();
//   const { zoneIds } = buildDescendantZoneSet(zones, targetCountry);
//   const normalizedZoneIds = new Set([...zoneIds].map((z) => String(z)));

//   // 4) scan map leaderboard until 10 Indians found
//   const wanted = 10;
//   const requested = 100;
//   const found = [];

//   for (let offset = 0; offset < 10_000 && found.length < wanted; ) {
//     const data = await getMapLeaderboardPage(mapUid, offset, requested);
//     const rows = data?.tops?.[0]?.top || [];
//     if (!rows.length) break;

//     for (const row of rows) {
//       if (!row?.accountId || row?.score == null || row?.zoneId == null) continue;
//       if (!normalizedZoneIds.has(String(row.zoneId))) continue;

//       found.push({
//         accountId: row.accountId,
//         timeOrScore: Number(row.score),
//         positionWorld: row.position,
//       });

//       if (found.length >= wanted) break;
//     }

//     offset += rows.length; // prevents skipping
//   }

//   // 5) resolve names
//   const nameMap = await resolveDisplayNames(found.map((x) => x.accountId));
//   const top10 = found.map((x) => ({
//     ...x,
//     displayName: nameMap?.[x.accountId] || x.accountId,
//   }));

//   const result = {
//     tmxId,
//     mapUid,
//     country: targetCountry,
//     mapName,
//     authorName,
//     authorTime, // ms
//     thumbnail,
//     top10,
//   };

//   cacheSet(cacheKey, result);
//   return result;
// }

// export async function fetchMapInfoByTmxId(tmxId) {
//   const mapUid = await tmxIdToMapUid(tmxId);

//   const tmx = await tmxGetMapInfoById(tmxId);

//   let nadeo = null;
//   try {
//     const url = `https://live-services.trackmania.nadeo.live/api/token/map/${encodeURIComponent(mapUid)}`;
//     const r = await nadeoGet({ tokenKey: "nadeo_live", url });
//     if (r.ok) nadeo = r.json;
//   } catch {
//     // ignore
//   }

//   return {
//     tmxId,
//     mapUid,
//     thumbnail: tmxThumbnailUrl(tmxId),
//     tmx,
//     nadeo,
//   };
// }

import { nadeoGet } from "../../api/nadeoClient.js";

import { tmxIdToMapUid } from "../../api/tmx.js";
import { getMapLeaderboardPage } from "../../api/mapLeaderboard.js";
import { tmxGetMapInfoById, tmxThumbnailUrl } from "../../api/tmxInfo.js";

import { getZones } from "../../api/tmCampaign.js";
import { buildDescendantZoneSet } from "../../zonesUtil.js";
import { resolveDisplayNames } from "../../api/displayNames.js";

// Optional small in-memory cache to reduce repeated calls
const CACHE_MS = 60 * 60 * 1000; // 1 hour
const MAX_PLAYERS = Number(process.env.MAX_MAP_PLAYERS || 5000); // NEW
const NAME_CHUNK = Number(process.env.NAME_RESOLVE_CHUNK || 200); // NEW

const cache = new Map(); // key -> { expiresAt, value }



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

      // retry only on gateway / transient issues
      const transient =
        msg.includes("(502)") || msg.includes("502") ||
        msg.includes("(503)") || msg.includes("503") ||
        msg.includes("(504)") || msg.includes("504") ||
        msg.toLowerCase().includes("bad gateway");

      if (!transient) throw e;

      // exponential backoff: 300ms, 700ms, 1500ms, 3000ms
      const wait = Math.min(3000, 200 * Math.pow(2, attempt));
      await sleep(wait);
    }
  }

  throw lastErr;
}




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

// NEW: resolve names in chunks so large results don't crash
async function resolveNamesInChunks(accountIds, chunkSize = 200) {
  const out = {};
  for (let i = 0; i < accountIds.length; i += chunkSize) {
    const chunk = accountIds.slice(i, i + chunkSize);
    try {
      const part = await resolveDisplayNames(chunk);
      if (part && typeof part === "object") Object.assign(out, part);
    } catch {
      // ignore chunk failures; keep going
    }
  }
  return out;
}

export async function fetchIndiaTop10ForTmxMap(tmxId, targetCountry) {
  // include MAX_PLAYERS in cache key so changing env doesn't serve old cache
  const cacheKey = `map_india_top10:${targetCountry}:${tmxId}:${MAX_PLAYERS}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // 1) TMX id -> mapUid
  const mapUid = await tmxIdToMapUid(tmxId);

  // 2) Map metadata (TMX + Nadeo)
  let mapName = null;
  let authorName = null;
  let authorTime = null;

  // TMX info (name + author)
  try {
    const tmx = await tmxGetMapInfoById(tmxId);
    mapName = tmx?.Name || tmx?.name || mapName;
    authorName = tmx?.Username || tmx?.AuthorName || tmx?.Author || authorName;
  } catch {
    // ignore TMX failures
  }

  // Nadeo map info (author time etc.)
  try {
    const infoUrl = `https://live-services.trackmania.nadeo.live/api/token/map/${encodeURIComponent(
      mapUid
    )}`;
    const info = await nadeoGet({ tokenKey: "nadeo_live", url: infoUrl });
    if (info.ok) {
      authorTime = info.json?.authorTime ?? null;
      mapName = mapName || info.json?.name || null;
    }
  } catch {
    // ignore Nadeo failures
  }

  const thumbnail = tmxThumbnailUrl(tmxId);

  // 3) zones -> India + descendants (normalize to string)
  const zones = await getZones();
  const { zoneIds } = buildDescendantZoneSet(zones, targetCountry);
  const normalizedZoneIds = new Set([...zoneIds].map((z) => String(z)));

  // 4) scan map leaderboard until MAX_PLAYERS Indians found (or until leaderboard ends)
  const requested = 100; // keep your working value
  const found = [];

  for (let offset = 0; offset < 10_000_000; ) {
    const data = await getMapLeaderboardPageWithRetry(mapUid, offset, requested);

    const rows = data?.tops?.[0]?.top || [];
    if (!rows.length) break;

    for (const row of rows) {
      if (!row?.accountId || row?.score == null || row?.zoneId == null) continue;
      if (!normalizedZoneIds.has(String(row.zoneId))) continue;

      found.push({
        accountId: row.accountId,
        timeOrScore: Number(row.score),
        positionWorld: row.position,
      });

      // NEW: stop once cap reached
      if (found.length >= MAX_PLAYERS) break;
    }

    // NEW: stop paging if cap reached
    if (found.length >= MAX_PLAYERS) break;

    // IMPORTANT: keep your working paging behavior
    offset += rows.length;

    // safety: if API ever returns empty-but-not-empty weirdness
    if (rows.length === 0) break;
  }

  // 5) resolve names (chunked + safe)
  const ids = found.map((x) => x.accountId);
  const nameMap = await resolveNamesInChunks(ids, NAME_CHUNK);

  // KEEP `top10` key so your bot doesn't break
  const top10 = found.map((x) => ({
    ...x,
    displayName: nameMap?.[x.accountId] || x.accountId,
  }));

  const result = {
    tmxId,
    mapUid,
    country: targetCountry,
    mapName,
    authorName,
    authorTime, // ms
    thumbnail,
    top10,

    // extra debug metadata (safe to keep)
    returned: top10.length,
    maxPlayers: MAX_PLAYERS,
  };

  cacheSet(cacheKey, result);
  return result;
}

export async function fetchMapInfoByTmxId(tmxId) {
  const mapUid = await tmxIdToMapUid(tmxId);

  const tmx = await tmxGetMapInfoById(tmxId);

  let nadeo = null;
  try {
    const url = `https://live-services.trackmania.nadeo.live/api/token/map/${encodeURIComponent(
      mapUid
    )}`;
    const r = await nadeoGet({ tokenKey: "nadeo_live", url });
    if (r.ok) nadeo = r.json;
  } catch {
    // ignore
  }

  return {
    tmxId,
    mapUid,
    thumbnail: tmxThumbnailUrl(tmxId),
    tmx,
    nadeo,
  };
}

