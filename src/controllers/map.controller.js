import { fetchIndiaTop10ForTmxMap, fetchMapInfoByTmxId } from "../services/map.service.js";

export async function getMapIndiaTop10(req, res) {
  const target = process.env.TARGET_COUNTRY_NAME || "India";
  const { tmxId } = req.params;

  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(500, Math.max(10, Number(req.query.pageSize || 100)));

  const data = await fetchIndiaTop10ForTmxMap(tmxId, target, { page, pageSize });
  res.json(data);
}

export async function getMapInfo(req, res) {
  const { tmxId } = req.params;
  const data = await fetchMapInfoByTmxId(tmxId);
  res.json(data);
}
