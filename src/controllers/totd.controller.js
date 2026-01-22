import { fetchTotdIndiaTop10 } from "../services/totd.service.js";

export async function getTotdIndiaTop10(req, res) {
  const target = process.env.TARGET_COUNTRY_NAME || "India";
  const data = await fetchTotdIndiaTop10(target);
  res.json(data);
}
