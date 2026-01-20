// server.js
import express from "express";
import "dotenv/config";
import mongoose from "mongoose";
import fetch from "node-fetch";

import { IndiaTop10 } from "./models/IndiaTop10.js";

import { nadeoGet } from "./api/nadeoClient.js";
import { getCurrentCampaign, getZones, getCampaignLeaderboardPage } from "./api/tmCampaign.js";
import { buildDescendantZoneSet } from "./zonesUtil.js";

import { resolveDisplayNames } from "./api/displayNames.js";

import { tmxIdToMapUid } from "./api/tmx.js";
import { getMapLeaderboardPage } from "./api/mapLeaderboard.js";
import { tmxGetMapInfoById, tmxThumbnailUrl } from "./api/tmxInfo.js";


import { IndiaMapTop10 } from "./models/IndiaMapTop10.js";


const app = express();
const PORT = process.env.PORT || 4000;

function pickTodaysTotdMapUid(monthJson, nowSec) {
  const month = monthJson?.monthList?.[0];
  const days = month?.days || [];
  if (!days.length) return null;

  // current TOTD (now between start/end)
  let d = days.find(x => nowSec >= x.startTimestamp && nowSec < x.endTimestamp);

  // fallback: most recent that started
  if (!d) {
    d = days
      .filter(x => x.startTimestamp <= nowSec)
      .sort((a, b) => b.startTimestamp - a.startTimestamp)[0];
  }

  return d?.mapUid || null;
}

// ---------- DB ----------
await mongoose.connect(process.env.MONGO_URI);
console.log("✅ MongoDB connected");

// ---------- Health ----------
app.get("/health/live", async (req, res) => {
  try {
    const url =
      "https://live-services.trackmania.nadeo.live/api/campaign/official?offset=0&length=1";
    const r = await nadeoGet({ tokenKey: "nadeo_live", url });
    res.status(r.ok ? 200 : r.status).send(r.json ?? r.text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/health/core", async (req, res) => {
  try {
    const url = "https://prod.trackmania.core.nadeo.online/zones/";
    const r = await nadeoGet({ tokenKey: "nadeo_core", url });
    res.status(r.ok ? 200 : r.status).send(r.json ?? r.text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---------- Campaign: Fetch + store + return India Top 10 ----------
app.get("/refresh/india-top10", async (req, res) => {
  try {
    const target = process.env.TARGET_COUNTRY_NAME || "India";

    // 1) current campaign
    const campaign = await getCurrentCampaign();

    // 2) zones -> India + descendants
    const zones = await getZones();
    const { zoneIds } = buildDescendantZoneSet(zones, target);
    const normalizedZoneIds = new Set([...zoneIds].map((z) => String(z)));

    // 3) scan campaign leaderboard until 10 Indians found
    const wanted = 10;
    const requested = 100;
    const found = [];

    for (let offset = 0; offset < 6000 && found.length < wanted; ) {
      const data = await getCampaignLeaderboardPage(campaign.seasonUid, offset, requested);
      const rows = data?.tops?.[0]?.top || [];
      if (!rows.length) break;

      for (const row of rows) {
        if (!row?.accountId || row?.sp == null || row?.zoneId == null) continue;
        if (!normalizedZoneIds.has(String(row.zoneId))) continue;

        found.push({
          accountId: row.accountId,
          points: Number(row.sp),
        });

        if (found.length >= wanted) break;
      }

      offset += rows.length; // prevents skipping
    }

    // 4) resolve display names
    const nameMap = await resolveDisplayNames(found.map((x) => x.accountId));

    // 5) upsert into Mongo
    const fetchedAt = new Date();
    const docs = found.map((x, i) => ({
      seasonUid: campaign.seasonUid,
      campaignName: campaign.name,
      fetchedAt,
      rankInIndia: i + 1,
      accountId: x.accountId,
      displayName: nameMap?.[x.accountId] || x.accountId,
      points: x.points,
    }));

    for (const d of docs) {
      await IndiaTop10.updateOne(
        { seasonUid: d.seasonUid, accountId: d.accountId },
        { $set: d },
        { upsert: true }
      );
    }

    res.json({ campaign, country: target, top10: docs });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});




app.get("/totd/india-top10", async (req, res) => {
  try {
    const target = process.env.TARGET_COUNTRY_NAME || "India";

    // 1) Get the current TOTD month list
    const url =
      "https://live-services.trackmania.nadeo.live/api/token/campaign/month?offset=0&length=1&royal=false";
    const monthResp = await nadeoGet({ tokenKey: "nadeo_live", url });
    if (!monthResp.ok) return res.status(monthResp.status).send(monthResp.json ?? monthResp.text);

    const nowSec = Math.floor(Date.now() / 1000);
    const mapUid = pickTodaysTotdMapUid(monthResp.json, nowSec);
    if (!mapUid) return res.status(404).json({ error: "Could not determine today's TOTD." });

    // 2) zones -> India + descendants
    const zones = await getZones();
    const { zoneIds } = buildDescendantZoneSet(zones, target);

    // 3) scan map leaderboard until 10 Indians found
    const wanted = 10;
    const pageSize = 500;
    const found = [];

    for (let offset = 0; offset < 200_000 && found.length < wanted; offset += pageSize) {
      const data = await getMapLeaderboardPage(mapUid, offset, pageSize);
      const rows = data?.tops?.[0]?.top || [];

      for (const row of rows) {
        if (!row?.accountId || row?.score == null || !row?.zoneId) continue;
        if (!zoneIds.has(row.zoneId)) continue;

        found.push({
          accountId: row.accountId,
          timeOrScore: Number(row.score),
          positionWorld: row.position,
        });

        if (found.length >= wanted) break;
      }

      if (!rows.length) break;
    }

    // 4) resolve names
    const nameMap = await resolveDisplayNames(found.map(x => x.accountId));
    const top10 = found.map(x => ({
      ...x,
      displayName: nameMap?.[x.accountId] || x.accountId,
    }));

    res.json({ country: target, mapUid, top10 });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});


// ---------- Campaign: Read cached from DB ----------
app.get("/india-top10", async (req, res) => {
  try {
    const campaign = await getCurrentCampaign();
    const list = await IndiaTop10.find({ seasonUid: campaign.seasonUid })
      .sort({ rankInIndia: 1 })
      .lean();

    res.json({ campaign, top10: list });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Health check up...to prevent server from sleeping
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});


// ---------- Map: TMX id -> mapUid -> India Top 10 map PBs ----------
const CACHE_MS = 60 * 1000; // 1 hour
app.get("/map/india-top10/:tmxId", async (req, res) => {
  try {
    const tmxId = req.params.tmxId;
    const target = process.env.TARGET_COUNTRY_NAME || "India";

    // 1) TMX id -> mapUid
    const mapUid = await tmxIdToMapUid(tmxId);

    // 2) Map metadata (TMX + Nadeo)
    let mapName = null;
    let authorName = null;
    let authorTime = null;

    // TMX info (name + author on TMX)
    try {
      const tmx = await tmxGetMapInfoById(tmxId);
      mapName = tmx?.Name || tmx?.name || mapName;
      authorName = tmx?.Username || tmx?.AuthorName || tmx?.Author || authorName;
    } catch {
      // ignore TMX failures
    }

    // Nadeo map info (author time etc.)
    try {
      const infoUrl = `https://live-services.trackmania.nadeo.live/api/token/map/${encodeURIComponent(mapUid)}`;
      const info = await nadeoGet({ tokenKey: "nadeo_live", url: infoUrl });
      if (info.ok) {
        authorTime = info.json?.authorTime ?? null;
        // If TMX name missing, Nadeo sometimes has it
        mapName = mapName || info.json?.name || null;
      }
    } catch {
      // ignore Nadeo failures
    }

    const thumbnail = tmxThumbnailUrl(tmxId);

    // 3) zones -> India + descendants (normalize zoneId to avoid Set mismatch)
    const zones = await getZones();
    const { zoneIds } = buildDescendantZoneSet(zones, target);
    const normalizedZoneIds = new Set([...zoneIds].map((z) => String(z)));

    // 4) scan map leaderboard until 10 Indians found
    const wanted = 10;
    const requested = 100; // keep it 100 (safe)
    const found = [];

    for (let offset = 0; offset < 10_000 && found.length < wanted; ) {
      const data = await getMapLeaderboardPage(mapUid, offset, requested);
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

        if (found.length >= wanted) break;
      }

      // advance by actual rows returned (prevents skipping)
      offset += rows.length;
    }

    // 5) resolve names for top10
    const nameMap = await resolveDisplayNames(found.map((x) => x.accountId));
    const top10 = found.map((x) => ({
      ...x,
      displayName: nameMap?.[x.accountId] || x.accountId,
    }));

    res.json({
      tmxId,
      mapUid,
      country: target,
      mapName,
      authorName,
      authorTime, // milliseconds
      thumbnail,
      top10,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});




app.get("/map/info/:tmxId", async (req, res) => {
  try {
    const tmxId = req.params.tmxId;

    // 1) TMX metadata
    const tmx = await tmxGetMapInfoById(tmxId);

    // 2) mapUid (you already have this helper)
    const mapUid = await tmxIdToMapUid(tmxId);

    // 3) Nadeo map metadata (authorTime, medals, etc.) :contentReference[oaicite:4]{index=4}
    let nadeo = null;
    try {
      const url = `https://live-services.trackmania.nadeo.live/api/token/map/${encodeURIComponent(mapUid)}`;
      const r = await nadeoGet({ tokenKey: "nadeo_live", url });
      if (r.ok) nadeo = r.json;
    } catch {
      // keep going even if this fails
    }

    res.json({
      tmxId,
      mapUid,
      thumbnail: tmxThumbnailUrl(tmxId),
      tmx,
      nadeo,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});


// ---------- Start ----------
app.listen(PORT, () => console.log(`✅ http://localhost:${PORT}`));
