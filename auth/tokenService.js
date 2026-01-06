import { ApiToken } from "../models/ApiToken.js";
import { getUbisoftTicket } from "./ubisoft.js";
import { getNadeoTokenFromUbiTicket } from "./nadeo.js";

// Nadeo tokens are typically ~24h. We'll set our own conservative expiry window.
const HOURS = (h) => h * 60 * 60 * 1000;
const DEFAULT_TTL = HOURS(20); // refresh before 24h

function isExpired(expiresAt) {
  return !expiresAt || new Date(expiresAt).getTime() <= Date.now();
}

export async function ensureNadeoToken(key) {
  const doc = await ApiToken.findOne({ key }).lean();

  if (doc && !isExpired(doc.expiresAt)) return doc.accessToken;

  // renew
  const ubiTicket = await getUbisoftTicket();

  const audience =
    key === "nadeo_live" ? "NadeoLiveServices" :
    key === "nadeo_core" ? "NadeoServices" :
    null;

  if (!audience) throw new Error(`Unknown token key: ${key}`);

  const accessToken = await getNadeoTokenFromUbiTicket(ubiTicket, audience);

  const now = new Date();
  const expiresAt = new Date(Date.now() + DEFAULT_TTL);

  await ApiToken.updateOne(
    { key },
    { $set: { key, accessToken, expiresAt, updatedAt: now } },
    { upsert: true }
  );

  return accessToken;
}

// Force refresh (used when API returns 401)
export async function refreshNadeoToken(key) {
  await ApiToken.deleteOne({ key });
  return ensureNadeoToken(key);
}
