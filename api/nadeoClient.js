import fetch from "node-fetch";
import Bottleneck from "bottleneck";
import { ensureNadeoToken, refreshNadeoToken } from "../auth/tokenService.js";

// Throttle: max 2 requests/second, 1 concurrent (safe default)
const limiter = new Bottleneck({ minTime: 500, maxConcurrent: 1 });

async function doFetch(url, token) {
  const r = await fetch(url, {
    headers: { Authorization: `nadeo_v1 t=${token}` }
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}

export async function nadeoGet({ tokenKey, url }) {
  return limiter.schedule(async () => {
    let token = await ensureNadeoToken(tokenKey);
    let res = await doFetch(url, token);

    if (res.status === 401) {
      // Refresh once, retry once
      token = await refreshNadeoToken(tokenKey);
      res = await doFetch(url, token);
    }

    // Basic backoff handling for 429/5xx can be added later if needed
    return res;
  });
}
