// bot.js
import "dotenv/config";
import fetch from "node-fetch";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const API_BASE = process.env.API_BASE || "http://localhost:4000";
const PREFIX = "god!";

// ---------------- helpers ----------------
function formatMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return String(ms);

  const minutes = Math.floor(n / 60000);
  const seconds = Math.floor((n % 60000) / 1000);
  const millis = n % 1000;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");
  return `${mm}:${ss}.${mmm}`;
}

function isLikelyTmxId(s) {
  return /^[0-9]{3,12}$/.test(String(s || "").trim());
}

function parseCommand(content) {
  const text = content.trim();
  if (!text.toLowerCase().startsWith(PREFIX)) return null;

  const rest = text.slice(PREFIX.length).trim();
  const [cmdRaw, ...args] = rest.split(/\s+/);
  const cmd = (cmdRaw || "").toLowerCase();
  return { cmd, args };
}

async function fetchJson(url) {
  const r = await fetch(url);
  const text = await r.text();

  if (!r.ok) {
    const msg = text?.slice(0, 1200) || "Unknown API error";
    throw new Error(`API error (${r.status}): ${msg}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`API returned non-JSON: ${text.slice(0, 300)}`);
  }
}

function helpEmbed() {
  return new EmbedBuilder()
    .setTitle("Commands")
    .setDescription(
      [
        `**god!map <tmxId>** - India Top 10 for a TMX map `,
        `**god!all** (coming soon)- India Top 10 (current official campaign points)`,
        `**god!help** - show this help`,
        ``,
        `Notes:`,
        `• Map leaderboards can be slow or incomplete on some tracks (very large leaderboards / campaign maps).`,
        `• This bot is best for TMX maps (not official campaign track leaderboards).`,
        ``,
        `Examples:`,
        `• \`god!map 273080\``,
        `• \`god!all\` (coming soon)`,
        ``,
        `For any concerns or information contact @Youtichz`,
      ].join("\n")
    );
}

// Optional cooldown to prevent spam / rate limits
const cooldown = new Map();
const COOLDOWN_MS = 3500;

function onCooldown(userId) {
  const now = Date.now();
  const last = cooldown.get(userId) || 0;
  if (now - last < COOLDOWN_MS) return true;
  cooldown.set(userId, now);
  return false;
}

// ---------------- bot ----------------
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const parsed = parseCommand(msg.content);
  if (!parsed) return;

  if (onCooldown(msg.author.id)) {
    return msg.reply("⏳ Wait a moment (cooldown).");
  }

  const { cmd, args } = parsed;

  try {
    // help
    if (cmd === "help" || cmd === "h") {
      return msg.reply({ embeds: [helpEmbed()] });
    }

    // god!map <tmxId>
    if (cmd === "map" || cmd === "m") {
      const tmxId = (args[0] || "").trim();
      if (!isLikelyTmxId(tmxId)) {
        return msg.reply({
          content: "❌ Use: `god!map <tmxId>` (example: `god!map 273080`)",
          embeds: [helpEmbed()],
        });
      }

      const thinking = await msg.reply(`⏳ Fetching India Top 10 for TMX **${tmxId}**...`);
      const data = await fetchJson(`${API_BASE}/map/india-top10/${encodeURIComponent(tmxId)}`);

      const top10 = data.top10 || [];
      if (!top10.length) {
        return thinking.edit(`No Indian records found for TMX id **${tmxId}**.`);
      }

      const mapTitle = data.mapName ? String(data.mapName) : `TMX ${data.tmxId ?? tmxId}`;
      const author = data.authorName ? String(data.authorName) : "Unknown";

      const authorTime =
        Number.isFinite(Number(data.authorTime)) ? formatMs(data.authorTime) : "—";

      const lines = top10.slice(0, 10).map((x, i) => {
        const name = x.displayName || x.accountId || "Unknown";
        const time = formatMs(x.timeOrScore);
        const world = x.positionWorld ?? "?";
        return `**${i + 1}.** ${name} — **${time}** · World **#${world}**`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`${mapTitle}`)
        .setURL(`https://trackmania.exchange/maps/${tmxId}`)
        .setDescription(lines.join("\n"))
        .addFields(
          { name: "Author", value: author, inline: true },
          { name: "Author Time", value: authorTime, inline: true },
          { name: "TMX ID", value: String(tmxId), inline: true }
        );

      if (data.thumbnail) embed.setImage(String(data.thumbnail));
      if (data.mapUid) embed.setFooter({ text: `mapUid: ${data.mapUid}` });

      return thinking.edit({ content: " ", embeds: [embed] });
    }

    // god!all (campaign)
    if (cmd === "all" || cmd === "a" || cmd === "campaign") {
      const thinking = await msg.reply("⏳ Fetching India Top 10 for current campaign...");

      // If you want ALWAYS fresh results, uncomment:
      // await fetchJson(`${API_BASE}/refresh/india-top10`);

      const data = await fetchJson(`${API_BASE}/india-top10`);
      const top10 = data.top10 || [];
      const campaign = data.campaign || {};

      if (!top10.length) return thinking.edit("No campaign top 10 found.");

      const lines = top10.slice(0, 10).map((x, i) => {
        const player = x.displayName || x.accountId || "Unknown";
        const pts = Number(x.points);
        const points = Number.isFinite(pts) ? pts.toLocaleString("en-US") : String(x.points);
        return `**${i + 1}.** ${player} - **${points}** pts`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`India Top 10 — ${campaign.name || "Current Campaign"}`)
        .setDescription(lines.join("\n"))
        .setFooter({ text: `seasonUid: ${campaign.seasonUid || "?"}` });

      return thinking.edit({ content: " ", embeds: [embed] });
    }

    // unknown
    return msg.reply({ content: "Unknown command.", embeds: [helpEmbed()] });
  } catch (e) {
    const errMsg = String(e?.message || e).slice(0, 1500);
    return msg.reply(`❌ ${errMsg}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
