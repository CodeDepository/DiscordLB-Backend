// api/mapLeaderboard.js
import { nadeoGet } from "./nadeoClient.js";

export async function getMapLeaderboardPage(mapUid, offset = 0, length = 100, groupUid = "Personal_Best") {
  const safeLen = Math.min(Math.max(Number(length) || 100, 1), 100); // clamp 1..100

  const url =
    `https://live-services.trackmania.nadeo.live/api/token/leaderboard/group/${encodeURIComponent(groupUid)}` +
    `/map/${encodeURIComponent(mapUid)}/top?onlyWorld=true&offset=${offset}&length=${safeLen}`;

  const r = await nadeoGet({ tokenKey: "nadeo_live", url });
  if (!r.ok) throw new Error(`map leaderboard failed (${r.status}): ${JSON.stringify(r.json ?? r.text)}`);
  return r.json;
}
