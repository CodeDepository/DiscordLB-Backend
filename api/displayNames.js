import fetch from "node-fetch";
import { getTmWebAccessToken } from "../auth/tmWebTokenService.js";

const norm = (id) => String(id || "").trim().toLowerCase();

export async function resolveDisplayNames(accountIds) {
  const uniq = [...new Set(accountIds.map(norm))].filter(Boolean);
  if (uniq.length === 0) return {};

  const ids = uniq.slice(0, 50);

  const token = await getTmWebAccessToken();
  const qs = ids.map((id) => `accountId[]=${encodeURIComponent(id)}`).join("&");
  const url = `https://api.trackmania.com/api/display-names?${qs}`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`display-names failed (${r.status}): ${text}`);

  const raw = JSON.parse(text); // expected: { "<accountId>": "<displayName>", ... }

  // build a normalized-key map so lookups always work
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    out[norm(k)] = v;
  }
  return out;
}
