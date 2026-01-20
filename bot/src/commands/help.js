import { EmbedBuilder } from "discord.js";

export function helpCommand(msg) {
  const embed = new EmbedBuilder()
    .setTitle("Commands")
    .setDescription(
      [
        `**god!map <tmxId>** - India Top 10 for a TMX map`,
        `**god!all** - India Top 10 (current official campaign points)`,
        `**god!help** - show this help`,
        ``,
        `Examples:`,
        `• \`god!map 273080\``,
        `• \`god!all\``,
      ].join("\n")
    );

  return msg.reply({ embeds: [embed] });
}
