import fetch from "node-fetch";

export async function fetchJson(url) {
  const r = await fetch(url);
  const text = await r.text();

  if (!r.ok) {
    const msg = text?.slice(0, 1200) || "Unknown API error";
    throw new Error(`API error (${r.status}): ${msg}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`API returned non-JSON: ${text.slice(0, 300)}`);
  }
}
