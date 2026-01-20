import { EmbedBuilder } from "discord.js";
import { API_BASE } from "../config.js";
import { fetchJson } from "../api.js";
import { formatMs, isLikelyTmxId, shortenName } from "../utils/format.js";
import { helpCommand } from "./help.js";

export async function mapCommand(msg, args) {
  const tmxId = (args?.[0] || "").trim();
  if (!isLikelyTmxId(tmxId)) {
    await msg.reply({ content: "❌ Dear, Bot - Use: `god!map <tmxId>` (example: `god!map 280003`)" });
    return helpCommand(msg);
  }

  const thinking = await msg.reply(`⏳ Fetching India Top 10 for TMX **${tmxId}**...`);
  const data = await fetchJson(`${API_BASE}/map/india-top10/${encodeURIComponent(tmxId)}`);

  const top10 = data.top10 || [];
  if (!top10.length) return thinking.edit(`No Indian records found for TMX id **${tmxId}**.`);

  const mapTitle = data.mapName ? String(data.mapName) : `TMX ${data.tmxId ?? tmxId}`;
  const author = data.authorName ? String(data.authorName) : "Unknown";
  const authorTime = Number.isFinite(Number(data.authorTime)) ? formatMs(data.authorTime) : "—";

  const rows = top10.slice(0, 10);

  // Mobile-friendly: one line per player
  const desc = rows
    .map((x, i) => {
      const name = shortenName(x.displayName || x.accountId || "Unknown", 22);
      const time = formatMs(x.timeOrScore);
      const world = x.positionWorld ?? "?";
      return `**${i + 1}.** ${name} - \`${time}\` (World \`#${world}\`)`;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle(mapTitle)
    .setURL(`https://trackmania.exchange/maps/${tmxId}`)
    .setDescription(desc)
    .addFields(
      { name: "Author", value: author, inline: true },
      { name: "Author Time", value: authorTime, inline: true },
      { name: "TMX ID", value: String(tmxId), inline: true }
    );

  if (data.thumbnail) embed.setImage(String(data.thumbnail));
  if (data.mapUid) embed.setFooter({ text: `mapUid: ${data.mapUid}` });

  return thinking.edit({ content: " ", embeds: [embed] });
}
