export function formatMs(ms) {
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

export function shortenName(name, max = 18) {
  const s = String(name ?? "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function isLikelyTmxId(s) {
  return /^[0-9]{3,12}$/.test(String(s || "").trim());
}
