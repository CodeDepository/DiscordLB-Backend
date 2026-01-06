import fetch from "node-fetch";

export async function tmxIdToMapUid(tmxId) {
  const url = `https://trackmania.exchange/api/maps/get_map_info/id/${encodeURIComponent(tmxId)}`; // :contentReference[oaicite:3]{index=3}

  const r = await fetch(url, {
    headers: { "User-Agent": process.env.USER_AGENT || "tm-india-bot/1.0" }
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`TMX lookup failed (${r.status}): ${text}`);

  const json = JSON.parse(text);

  // TMX usually returns TrackUID (sometimes empty on older issues, but usually ok)
  const uid = json?.TrackUID || json?.TrackUid || json?.UID || json?.uid;
  if (!uid) throw new Error("TMX response missing TrackUID/UID (mapUid).");

  return uid;
}
