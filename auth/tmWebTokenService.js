import fetch from "node-fetch";

let cached = { token: null, expiresAt: 0 };

export async function getTmWebAccessToken() {
  // refresh 60s before expiry
  if (cached.token && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const clientId = process.env.TM_CLIENT_ID;
  const clientSecret = process.env.TM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing TM_CLIENT_ID / TM_CLIENT_SECRET in .env");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  });

  const r = await fetch("https://api.trackmania.com/api/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`TM access_token failed (${r.status}): ${text}`);

  const json = JSON.parse(text);
  const accessToken = json?.access_token;
  const expiresIn = Number(json?.expires_in);

  if (!accessToken || !expiresIn) throw new Error("TM token response missing access_token/expires_in");

  cached.token = accessToken;
  cached.expiresAt = Date.now() + expiresIn * 1000;
  return accessToken;
}
