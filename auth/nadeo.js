import fetch from "node-fetch";

export async function getNadeoTokenFromUbiTicket(ubiTicket, audience) {
  const url = "https://prod.trackmania.core.nadeo.online/v2/authentication/token/ubiservices";

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `ubi_v1 t=${ubiTicket}`,
      "Content-Type": "application/json",
      "User-Agent": process.env.USER_AGENT || "tm-india-top10/1.0"
    },
    body: JSON.stringify({ audience })
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`Nadeo token failed (${r.status}): ${text}`);

  const json = JSON.parse(text);
  if (!json?.accessToken) throw new Error("Nadeo response missing accessToken");
  return json.accessToken;
}
