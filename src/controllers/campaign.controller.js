import { refreshCampaignIndiaTop10, readCampaignIndiaTop10 } from "../services/campaign.service.js";

export async function refreshIndiaTop10(req, res) {
  const target = process.env.TARGET_COUNTRY_NAME || "India";
  const data = await refreshCampaignIndiaTop10(target);
  res.json(data);
}

export async function getCachedIndiaTop10(req, res) {
  const data = await readCampaignIndiaTop10();
  res.json(data);
}

