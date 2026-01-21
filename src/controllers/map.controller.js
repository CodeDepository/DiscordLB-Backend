import { fetchIndiaTop10ForTmxMap, fetchMapInfoByTmxId } from "../services/map.service.js";

export async function getMapIndiaTop10(req, res) {
  const target = process.env.TARGET_COUNTRY_NAME || "India";
  const { tmxId } = req.params;

  const data = await fetchIndiaTop10ForTmxMap(tmxId, target);
  res.json(data);
}

export async function getMapInfo(req, res) {
  const { tmxId } = req.params;
  const data = await fetchMapInfoByTmxId(tmxId);
  res.json(data);
}
