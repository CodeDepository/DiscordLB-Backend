import fetch from "node-fetch";

function base64(s) {
  return Buffer.from(s, "utf8").toString("base64");
}

export async function getUbisoftTicket() {
  const email = process.env.UBI_EMAIL;
  const pass = process.env.UBI_PASSWORD;
  const appId = process.env.UBI_APP_ID;
  if (!email || !pass || !appId) throw new Error("Missing UBI_EMAIL/UBI_PASSWORD/UBI_APP_ID");

  const url = "https://public-ubiservices.ubi.com/v3/profiles/sessions";
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${base64(`${email}:${pass}`)}`,
      "Ubi-AppId": appId,
      "Content-Type": "application/json",
      "User-Agent": process.env.USER_AGENT || "tm-india-top10/1.0"
    },
    body: "{}"
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`Ubisoft ticket failed (${r.status}): ${text}`);

  const json = JSON.parse(text);
  if (!json?.ticket) throw new Error("Ubisoft response missing ticket");
  return json.ticket;
}
