import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { parseCommand } from "./src/utils/parse.js";
import { onCooldown } from "./src/utils/cooldown.js";
import { helpCommand } from "./src/commands/help.js";
import { mapCommand } from "./src/commands/map.js";
import { allCommand } from "./src/commands/all.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (msg) => {
  try {
    if (msg.author.bot) return;

    const parsed = parseCommand(msg.content);
    if (!parsed) return;

    if (onCooldown(msg.author.id)) {
      return msg.reply("⏳ Wait a moment (cooldown).");
    }

    const { cmd, args } = parsed;

    if (cmd === "help" || cmd === "h") return helpCommand(msg);
    if (cmd === "map" || cmd === "m") return mapCommand(msg, args);
    if (cmd === "all" || cmd === "a" || cmd === "campaign") return allCommand(msg);

    return msg.reply({ content: "Unknown command. Try `god!help`." });
  } catch (e) {
    const errMsg = String(e?.message || e).slice(0, 1500);
    return msg.reply(`❌ ${errMsg}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
