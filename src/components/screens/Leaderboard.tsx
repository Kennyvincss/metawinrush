"use client";
import { useEffect, useState } from "react";
import type { Leaderboard as LB, LeaderboardEntry } from "@/lib/backend/types";
import { CITIES, getCity, type CityId } from "@/lib/data/cities";
import type { LeaderboardPeriod } from "@/lib/progression/periods";
import { shareText } from "@/lib/share";
import { useApp } from "../AppState";
import { Avatar, Empty, Icon, ScreenHeader } from "../ui";

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "alltime", label: "All-time" },
];

export function RankRow({ e, me }: { e: LeaderboardEntry; me: boolean }) {
  const medal = e.rank === 1 ? "from-amber-300 to-yellow-500 text-ink-950" : e.rank === 2 ? "from-slate-200 to-slate-400 text-ink-950" : e.rank === 3 ? "from-orange-300 to-amber-700 text-ink-950" : "from-white/10 to-white/5 text-white/80";
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-2.5 ${me ? "border-mw-cyan/50 bg-mw-cyan/10" : "border-white/5 bg-white/[0.03]"}`}>
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br font-display text-sm font-black ${medal}`}>{e.rank}</div>
      <Avatar characterId={e.characterId} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">
          {e.username} {me && <span className="text-mw-cyan">(you)</span>}
        </div>
        <div className="text-[11px] text-white/50">
          Level {e.level}
          {e.city ? ` · ${getCity(e.city).name}` : ""}
          {e.at ? ` · ${new Date(e.at).toLocaleDateString()}` : ""}
        </div>
      </div>
      <div className="font-display text-sm font-bold tabular-nums">{e.score.toLocaleString()}</div>
    </div>
  );
}

export default function Leaderboard() {
  const { backend, state, mode } = useApp();
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [city, setCity] = useState<CityId | "">("");
  const [data, setData] = useState<LB | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    setErr(null);
    backend
      ?.leaderboard(period, city || null)
      .then((d) => live && setData(d))
      .catch((e) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [backend, period, city]);

  if (!state) return null;
  const top = data?.entries.slice(0, 3) ?? [];

  return (
    <div className="pb-6">
      <ScreenHeader
        title="Leaderboard"
        subtitle={mode === "online" ? "Server-validated scores from every runner" : "Offline mode · runs on this device"}
        right={
          data?.me ? (
            <button
              className="btn-ghost px-3"
              onClick={() => shareText(`I'm ranked #${data.me!.rank} on the ${PERIODS.find((p) => p.id === period)!.label.toLowerCase()} METAWIN RUSH leaderboard with ${data.me!.score.toLocaleString()} points! Run. Collect. Compete. Win.`)}
              aria-label="Share rank"
            >
              <Icon name="share" />
            </button>
          ) : undefined
        }
      />
      {mode === "local" && (
        <div className="panel mb-3 flex gap-2 border-mw-cyan/20 p-3 text-xs text-white/70">
          <Icon name="info" className="h-4 w-4 shrink-0 text-mw-cyan" />
          You're playing offline, so this board lists your own best runs on this device. Connect Supabase (see README) for the global leaderboard.
        </div>
      )}
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)} className={`rounded-lg py-2 font-display text-[11px] font-bold uppercase tracking-wider ${period === p.id ? "bg-gradient-to-r from-mw-purple to-mw-violet" : "text-white/60"}`}>
            {p.label}
          </button>
        ))}
      </div>
      <select value={city} onChange={(e) => setCity(e.target.value as CityId | "")} className="mb-4 w-full rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-sm" aria-label="Filter by city">
        <option value="">All cities</option>
        {CITIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {err && <Empty icon="info" title="Couldn't load rankings" text={err} />}
      {!err && !data && <div className="panel h-40 animate-pulse" />}
      {data && data.entries.length === 0 && <Empty icon="trophy" title="No runs yet" text="Be the first to post a score for this period." />}

      {data && data.entries.length > 0 && (
        <>
          {mode === "online" && top.length >= 1 && (
            <div className="mb-4 grid grid-cols-3 items-end gap-2">
              {[top[1], top[0], top[2]].map((e, i) =>
                e ? (
                  <div key={e.userId + e.rank} className={`panel flex flex-col items-center p-3 text-center ${i === 1 ? "shadow-neon" : ""}`} style={{ minHeight: i === 1 ? 170 : 145 }}>
                    <div className="relative">
                      <Avatar characterId={e.characterId} size={i === 1 ? 64 : 50} />
                      <div className={`absolute -bottom-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full font-display text-xs font-black text-ink-950 ${e.rank === 1 ? "bg-amber-300" : e.rank === 2 ? "bg-slate-300" : "bg-orange-400"}`}>{e.rank}</div>
                    </div>
                    <div className="mt-3 w-full truncate text-xs font-bold">{e.username}</div>
                    <div className="font-display text-sm font-bold tabular-nums text-gradient">{e.score.toLocaleString()}</div>
                  </div>
                ) : (
                  <div key={i} />
                ),
              )}
            </div>
          )}
          <div className="space-y-2">
            {data.entries.map((e, i) => (
              <RankRow key={`${e.userId}-${i}`} e={e} me={mode === "online" && e.userId === state.userId} />
            ))}
          </div>
          {data.me && mode === "online" && !data.entries.some((e) => e.userId === state.userId) && (
            <div className="sticky bottom-20 mt-3">
              <RankRow e={{ rank: data.me.rank, userId: state.userId, username: state.username, characterId: state.equipped.character, level: 0, score: data.me.score }} me />
            </div>
          )}
        </>
      )}
    </div>
  );
}
