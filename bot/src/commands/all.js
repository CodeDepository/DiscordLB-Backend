import { EmbedBuilder } from "discord.js";
import { API_BASE } from "../config.js";
import { fetchJson } from "../api.js";
import { shortenName } from "../utils/format.js";

export async function allCommand(msg) {
  const thinking = await msg.reply("⏳ Fetching India Top 10 for current campaign...");
  const data = await fetchJson(`${API_BASE}/india-top10`);

  const top10 = data.top10 || [];
  const campaign = data.campaign || {};
  if (!top10.length) return thinking.edit("No campaign top 10 found.");

  const rows = top10.slice(0, 10);

  const colName = rows.map((x, i) => `**${i + 1}.** ${shortenName(x.displayName || x.accountId || "Unknown", 18)}`).join("\n");
  const colPts = rows.map((x) => {
    const pts = Number(x.points);
    const points = Number.isFinite(pts) ? pts.toLocaleString("en-US") : String(x.points ?? "0");
    return `\`${points}\``;
  }).join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`India Top 10 — ${campaign.name || "Current Campaign"}`)
    .addFields(
      { name: "Player", value: colName, inline: true },
      { name: "Points", value: colPts, inline: true }
    )
    .setFooter({ text: `seasonUid: ${campaign.seasonUid || "?"}` });

  return thinking.edit({ content: " ", embeds: [embed] });
}
