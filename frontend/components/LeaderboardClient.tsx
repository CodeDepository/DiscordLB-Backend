"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  accountId: string;
  displayName?: string;
  timeOrScore: number;
  positionWorld?: number | null;
  recordTs?: number | string | null;
};

type ApiResponse = {
  top10?: Row[];
  hasMore?: boolean;
  page?: number;
  pageSize?: number;
};

function formatTmTime(ms?: number | null) {
  if (ms == null || Number.isNaN(Number(ms))) return "—";
  const total = Number(ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const milli = total % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
}

function vagueTimeAgo(ts?: number | string | null) {
  if (!ts) return "—";

  let tsMs = Number(ts);
  if (!Number.isFinite(tsMs)) return "—";

  // if seconds, convert to ms
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

export default function LeaderboardClient({
  tmxId,
  pageSize = 100,
}: {
  tmxId: string;
  pageSize?: number;
}) {
  const base = process.env.NEXT_PUBLIC_API_BASE;

  const apiBase = useMemo(() => {
    // you can change this fallback to your deployed backend
    return base?.trim() || "http://localhost:4000";
  }, [base]);

  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  async function load(nextPage: number, mode: "replace" | "append" = "replace") {
    setLoading(true);
    setErr("");

    try {
      const url = `${apiBase}/map/india-top10/${encodeURIComponent(tmxId)}?page=${nextPage}&pageSize=${pageSize}`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${text || res.statusText}`);
      }

      const data = (await res.json()) as ApiResponse;

      const newRows = Array.isArray(data?.top10) ? data.top10 : [];
      const more = Boolean(data?.hasMore);

      setHasMore(more);
      setRows((prev) => (mode === "append" ? [...prev, ...newRows] : newRows));
      setPage(nextPage);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
      setErr(message);
    } finally {
      setLoading(false);
}

    
  }

  useEffect(() => {
    setPage(1);
    setRows([]);
    setHasMore(false);
    load(1, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmxId, apiBase, pageSize]);

  const indiaStart = (page - 1) * pageSize;

  return (
    <section className="mt-10 w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">Leaderboard</h2>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Page <span className="font-semibold">{page}</span> · Size{" "}
          <span className="font-semibold">{pageSize}</span>
        </div>
      </div>

      {!base ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <b>Note:</b> NEXT_PUBLIC_API_BASE is not set, using fallback:{" "}
          <span className="font-mono">{apiBase}</span>
        </div>
      ) : null}

      {err ? (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
          <div className="mb-2 font-semibold">Error</div>
          <div className="mb-3 break-words font-mono text-xs">{err}</div>
          <button
            onClick={() => load(page, "replace")}
            className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-medium hover:bg-rose-50 dark:border-rose-500/40 dark:bg-black dark:hover:bg-white/5"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/10">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
            <tr>
              <th className="px-3 py-3">India #</th>
              <th className="px-3 py-3">World #</th>
              <th className="px-3 py-3">Player</th>
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Set</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td className="px-3 py-6 text-zinc-500 dark:text-zinc-400" colSpan={5}>
                  No results.
                </td>
              </tr>
            ) : null}

            {rows.map((row, idx) => (
              <tr key={`${row.accountId}-${idx}`} className="border-t border-zinc-100 dark:border-white/10">
                <td className="px-3 py-3">{indiaStart + idx + 1}</td>
                <td className="px-3 py-3">{row.positionWorld ?? "—"}</td>
                <td className="px-3 py-3 font-semibold">
                  {row.displayName || row.accountId}
                </td>
                <td className="px-3 py-3">{formatTmTime(row.timeOrScore)}</td>
                <td className="px-3 py-3">{vagueTimeAgo(row.recordTs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          disabled={loading || page === 1}
          onClick={() => load(page - 1, "replace")}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-black dark:hover:bg-white/5"
        >
          Prev
        </button>

        <button
          disabled={loading || !hasMore}
          onClick={() => load(page + 1, "replace")}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-black dark:hover:bg-white/5"
        >
          Next
        </button>

        <button
          disabled={loading || !hasMore}
          onClick={() => load(page + 1, "append")}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-black dark:hover:bg-white/5"
        >
          Load next (append)
        </button>

        {loading ? <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span> : null}
      </div>
    </section>
  );
}
