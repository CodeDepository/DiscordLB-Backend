const cooldown = new Map();
const COOLDOWN_MS = 3500;

export function onCooldown(userId) {
  const now = Date.now();
  const last = cooldown.get(userId) || 0;
  if (now - last < COOLDOWN_MS) return true;
  cooldown.set(userId, now);
  return false;
}
