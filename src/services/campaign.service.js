import { IndiaTop10 } from "../../models/IndiaTop10.js";

import { getCurrentCampaign, getZones, getCampaignLeaderboardPage } from "../../api/tmCampaign.js";
import { buildDescendantZoneSet } from "../../zonesUtil.js";
import { resolveDisplayNames } from "../../api/displayNames.js";

export async function refreshCampaignIndiaTop10(targetCountry) {
  // 1) current campaign
  const campaign = await getCurrentCampaign();

  // 2) zones -> India + descendants
  const zones = await getZones();
  const { zoneIds } = buildDescendantZoneSet(zones, targetCountry);
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

  await Promise.all(
    docs.map((d) =>
      IndiaTop10.updateOne(
        { seasonUid: d.seasonUid, accountId: d.accountId },
        { $set: d },
        { upsert: true }
      )
    )
  );

  return { campaign, country: targetCountry, top10: docs };
}

export async function readCampaignIndiaTop10() {
  const campaign = await getCurrentCampaign();
  const list = await IndiaTop10.find({ seasonUid: campaign.seasonUid })
    .sort({ rankInIndia: 1 })
    .lean();

  return { campaign, top10: list };
}
