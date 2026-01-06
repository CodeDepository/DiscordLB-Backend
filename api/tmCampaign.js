import { nadeoGet } from "./nadeoClient.js";

// Live: current official campaign
export async function getCurrentCampaign() {
  const url =
    "https://live-services.trackmania.nadeo.live/api/campaign/official?offset=0&length=1";

  const r = await nadeoGet({ tokenKey: "nadeo_live", url });
  if (!r.ok) throw new Error(`Campaign failed (${r.status}): ${r.text}`);

  const campaign = r.json?.campaignList?.[0];
  if (!campaign?.seasonUid) throw new Error("Campaign response missing seasonUid");

  return {
    seasonUid: campaign.seasonUid,
    name: campaign.name ?? "Official Campaign"
  };
}

// Core: zones list
export async function getZones() {
  const url = "https://prod.trackmania.core.nadeo.online/zones/";
  const r = await nadeoGet({ tokenKey: "nadeo_core", url });
  if (!r.ok) throw new Error(`Zones failed (${r.status}): ${r.text}`);
  if (!Array.isArray(r.json)) throw new Error("Zones response not an array");
  return r.json;
}

// Live: campaign leaderboard pages
export async function getCampaignLeaderboardPage(seasonUid, offset, length) {
  const url =
    `https://live-services.trackmania.nadeo.live/api/token/leaderboard/group/${encodeURIComponent(seasonUid)}` +
    `/top?onlyWorld=true&offset=${offset}&length=${length}`;

  const r = await nadeoGet({ tokenKey: "nadeo_live", url });
  if (!r.ok) throw new Error(`Leaderboard failed (${r.status}): ${r.text}`);
  return r.json;
}
