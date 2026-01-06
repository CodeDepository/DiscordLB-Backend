import fetch from "node-fetch";

// TMX single map info (deprecated but works): /api/maps/get_map_info/id/{id} :contentReference[oaicite:2]{index=2}
export async function tmxGetMapInfoById(tmxId) {
  const url = `https://trackmania.exchange/api/maps/get_map_info/id/${encodeURIComponent(tmxId)}`;
  const r = await fetch(url);
  const text = await r.text();
  if (!r.ok) throw new Error(`TMX get_map_info failed (${r.status}): ${text.slice(0, 500)}`);

  // TMX returns JSON
  return JSON.parse(text);
}

// TMX thumbnail URL :contentReference[oaicite:3]{index=3}
export function tmxThumbnailUrl(tmxId) {
  return `https://trackmania.exchange/maps/thumbnail/${encodeURIComponent(tmxId)}`;
}
