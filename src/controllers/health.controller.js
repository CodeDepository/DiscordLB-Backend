import { nadeoGet } from "../../api/nadeoClient.js";

export function healthOk(req, res) {
  res.status(200).send("ok");
}

export async function healthLive(req, res) {
  const url =
    "https://live-services.trackmania.nadeo.live/api/campaign/official?offset=0&length=1";
  const r = await nadeoGet({ tokenKey: "nadeo_live", url });
  res.status(r.ok ? 200 : r.status).send(r.json ?? r.text);
}

export async function healthCore(req, res) {
  const url = "https://prod.trackmania.core.nadeo.online/zones/";
  const r = await nadeoGet({ tokenKey: "nadeo_core", url });
  res.status(r.ok ? 200 : r.status).send(r.json ?? r.text);
}
