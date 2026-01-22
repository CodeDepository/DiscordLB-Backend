export function pickTodaysTotdMapUid(monthJson, nowSec) {
  const month = monthJson?.monthList?.[0];
  const days = month?.days || [];
  if (!days.length) return null;

  // current TOTD (now between start/end)
  let d = days.find((x) => nowSec >= x.startTimestamp && nowSec < x.endTimestamp);

  // fallback: most recent that started
  if (!d) {
    d = days
      .filter((x) => x.startTimestamp <= nowSec)
      .sort((a, b) => b.startTimestamp - a.startTimestamp)[0];
  }

  return d?.mapUid || null;
}
