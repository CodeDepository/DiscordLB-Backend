export const dynamic = "force-dynamic"; // always fetch fresh during dev

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import LeaderboardClient from "@/components/LeaderboardClient";

function formatTmTime(ms) {
  if (ms == null) return "—";
  const total = Number(ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const milli = total % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
}

async function getData(tmxId) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  const url = `${base}/map/india-top10/${encodeURIComponent(tmxId)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

function vagueTimeAgo(ts) {
  if (!ts) return "a while ago";

  let tsMs = Number(ts);
  if (tsMs > 0 && tsMs < 10_000_000_000) tsMs *= 1000;

  const diff = Date.now() - tsMs;
  if (diff < 0) return "just now";

  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const mo = Math.floor(day / 30);
  const yr = Math.floor(day / 365);

  if (sec < 30) return "just now";
  if (sec < 90) return "a minute ago";
  if (min < 60) return `${min} mins ago`;
  if (hr < 24) return `${hr} hrs ago`;
  if (day < 7) return `${day} days ago`;
  if (day < 14) return "a while ago";
  if (mo < 12) return `${mo} months ago`;
  return `${yr} years ago`;
}

export default async function MapPage({ params }) {
  const p = typeof params?.then === "function" ? await params : params;
  const { tmxId } = p;

  const data = await getData(tmxId);

  const {
    mapName,
    authorName,
    authorTime,
    thumbnail,
    mapUid,
    country,
    top10,
    returned,
    maxPlayers,
  } = data;

 return (
  <main className="min-h-screen">
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* HERO */}
      <Card className="overflow-hidden rounded-3xl border">
        <div className="relative">
          {/* Background image */}
          <div className="relative h-[360px] sm:h-[420px] md:h-[520px]">
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt="Map thumbnail"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 1024px"
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}

            {/* Overlays for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-background" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.10),transparent_55%)]" />

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <div className="text-center max-w-3xl">
                <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-sm">
                  <Badge variant="secondary" className="bg-white/10 text-white border-white/15">
                    TMX #{tmxId}
                  </Badge>
                  <Badge variant="outline" className="text-white border-white/20">
                    {country || "Unknown country"}
                  </Badge>
                  {mapUid ? (
                    <span className="text-xs text-white/70">
                      MapUid: <span className="font-mono text-white/80">{mapUid}</span>
                    </span>
                  ) : null}
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white drop-shadow">
                  {mapName || "Unknown map"}
                </h1>

                <div className="mt-3 text-sm sm:text-base text-white/80">
                  by{" "}
                  <span className="font-semibold text-white">
                    {authorName || "—"}
                  </span>{" "}
                  · Author Time{" "}
                  <span className="font-mono font-semibold text-white">
                    {formatTmTime(authorTime)}
                  </span>
                </div>

                <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-4 py-2 backdrop-blur">
                  <div className="text-left">
                    <div className="text-xs text-white/70">Players</div>
                    <div className="text-xl font-semibold text-white">
                      {returned ?? top10?.length ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Small section header under hero */}
          <CardContent className="pt-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xl font-semibold">Leaderboard</div>
                <div className="text-sm text-muted-foreground">India top 10</div>
                {/* <LeaderboardClient tmxId={tmxId} initialPageSize={100} /> */}


              </div>
            </div>

            <Separator className="my-4" />

            {!top10?.length ? (
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                No players found for this map/country.
              </div>
            ) : (
              <div className="max-h-[560px] overflow-y-auto pr-2 space-y-3">
                {top10.map((row, idx) => (
                  <div
                    key={`${row.accountId}-${idx}`}
                    className="rounded-2xl border bg-background/80 backdrop-blur px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-semibold">
                          {idx + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {row.displayName || row.accountId}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            World #{row.positionWorld ?? "—"} · {row.accountId}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-semibold">
                          {formatTmTime(row.timeOrScore)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {vagueTimeAgo(row.recordTs)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  </main>
);

}
