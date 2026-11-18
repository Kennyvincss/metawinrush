"use client";
import { useEffect, useState } from "react";
import type { TournamentDetail, TournamentView } from "@/lib/backend/types";
import { getCity } from "@/lib/data/cities";
import { useApp } from "../AppState";
import { CityArt, Empty, Icon, Modal, ScreenHeader, timeLeft } from "../ui";
import { RankRow } from "./Leaderboard";

const KIND_STYLE: Record<TournamentView["kind"], { label: string; cls: string }> = {
  daily: { label: "Daily competition", cls: "text-mw-cyan border-mw-cyan/40" },
  weekly: { label: "Weekly tournament", cls: "text-mw-violet border-mw-violet/40" },
  city: { label: "City battle", cls: "text-amber-300 border-amber-300/40" },
  special: { label: "Special event", cls: "text-mw-pink border-mw-pink/40" },
};

export default function Arena() {
  const { backend, state, mode, setCity, go } = useApp();
  const [list, setList] = useState<TournamentView[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<TournamentDetail | null>(null);

  useEffect(() => {
    backend
      ?.tournaments()
      .then(setList)
      .catch((e) => setErr(e.message));
  }, [backend]);

  const show = async (t: TournamentView) => {
    try {
      setOpen(await backend!.tournament(t.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  if (!state) return null;
  return (
    <div className="pb-6">
      <ScreenHeader title="Metawin Arena" subtitle="Score-based tournaments · best run in the window counts" />
      <div className="panel mb-4 flex gap-2 p-3 text-xs text-white/65">
        <Icon name="info" className="h-4 w-4 shrink-0 text-mw-cyan" />
        <span>
          Arena events are <b>asynchronous</b>: everyone runs on their own time and your best score inside each event's window is ranked. They are not live head-to-head races.
          {mode === "local" && " Offline mode shows only your own runs — connect Supabase to compete with others."}
        </span>
      </div>
      {err && <Empty icon="info" title="Couldn't load the Arena" text={err} />}
      {!list && !err && <div className="panel h-48 animate-pulse" />}
      <div className="grid gap-4 sm:grid-cols-2">
        {list?.map((t) => {
          const k = KIND_STYLE[t.kind];
          const locked = t.city && !state.unlockedCities.includes(t.city);
          return (
            <div key={t.id} className="panel overflow-hidden" data-testid={`tournament-${t.kind}`}>
              <div className="relative h-28">
                <CityArt cityId={t.city ?? "tokyo"} className="absolute inset-0 h-full w-full" />
                <div className="absolute left-3 top-3">
                  <span className={`chip bg-black/50 ${k.cls}`}>{k.label}</span>
                </div>
                <div className="absolute bottom-2 left-3 right-3">
                  <div className="heading text-lg">{t.name}</div>
                  <div className="text-xs text-white/70">{t.city ? getCity(t.city).name : "All cities"}</div>
                </div>
              </div>
              <div className="space-y-3 p-3">
                <p className="text-xs text-white/60">{t.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Stat label="Starts" value={new Date(t.startsAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} />
                  <Stat label="Ends in" value={timeLeft(t.endsAt)} />
                  <Stat label="Participants" value={t.participants.toLocaleString()} />
                  <Stat label="Top score" value={t.topScore?.toLocaleString() ?? "—"} />
                  <Stat label="Your best" value={t.myScore?.toLocaleString() ?? "No entry"} />
                  <Stat label="Your rank" value={t.myRank ? `#${t.myRank}` : "—"} />
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1" onClick={() => show(t)}>
                    Standings
                  </button>
                  <button
                    className="btn-primary flex-1"
                    disabled={!!locked}
                    onClick={() => {
                      if (t.city) setCity(t.city);
                      go("game");
                    }}
                  >
                    {locked ? "City locked" : "Enter"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name}>
        {open && (
          <div className="space-y-2">
            <div className="mb-2 text-xs text-white/55">Ends in {timeLeft(open.endsAt)} · {open.participants} participants</div>
            {open.entries.length === 0 && <div className="py-6 text-center text-sm text-white/60">No entries yet. Post the first score!</div>}
            {open.entries.map((e, i) => (
              <RankRow key={i} e={e} me={mode === "online" && e.userId === state.userId} />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-white/45">{label}</div>
      <div className="truncate font-semibold tabular-nums">{value}</div>
    </div>
  );
}
