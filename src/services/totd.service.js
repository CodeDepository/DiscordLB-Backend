import { nadeoGet } from "../../api/nadeoClient.js";
import { getZones } from "../../api/tmCampaign.js";
import { buildDescendantZoneSet } from "../../zonesUtil.js";
import { getMapLeaderboardPage } from "../../api/mapLeaderboard.js";
import { resolveDisplayNames } from "../../api/displayNames.js";
import { pickTodaysTotdMapUid } from "../utils/pickTodaysTotd.js";

export async function fetchTotdIndiaTop10(targetCountry) {
  // 1) Get current TOTD month list
  const url =
    "https://live-services.trackmania.nadeo.live/api/token/campaign/month?offset=0&length=1&royal=false";
  const monthResp = await nadeoGet({ tokenKey: "nadeo_live", url });
  if (!monthResp.ok) {
    const err = new Error("Failed to fetch TOTD month list");
    err.status = monthResp.status;
    throw err;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const mapUid = pickTodaysTotdMapUid(monthResp.json, nowSec);
  if (!mapUid) {
    const err = new Error("Could not determine today's TOTD.");
    err.status = 404;
    throw err;
  }

  // 2) zones -> India + descendants
  const zones = await getZones();
  const { zoneIds } = buildDescendantZoneSet(zones, targetCountry);
  const normalizedZoneIds = new Set([...zoneIds].map((z) => String(z)));

  // 3) scan map leaderboard until 10 Indians found
  const wanted = 10;
  const pageSize = 500;
  const found = [];

  for (let offset = 0; offset < 200_000 && found.length < wanted; offset += pageSize) {
    const data = await getMapLeaderboardPage(mapUid, offset, pageSize);
    const rows = data?.tops?.[0]?.top || [];

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

    if (!rows.length) break;
  }

  // 4) resolve names
  const nameMap = await resolveDisplayNames(found.map((x) => x.accountId));
  const top10 = found.map((x) => ({
    ...x,
    displayName: nameMap?.[x.accountId] || x.accountId,
  }));

  return { country: targetCountry, mapUid, top10 };
}
