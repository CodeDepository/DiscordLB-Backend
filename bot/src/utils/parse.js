import { PREFIX } from "../config.js";

export function parseCommand(content) {
  const text = String(content || "").trim();
  if (!text.toLowerCase().startsWith(PREFIX)) return null;

  const rest = text.slice(PREFIX.length).trim();
  const [cmdRaw, ...args] = rest.split(/\s+/);
  const cmd = (cmdRaw || "").toLowerCase();
  return { cmd, args };
}
