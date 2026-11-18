"use client";
import { useState } from "react";
import { audio } from "@/game/audio/engine";
import { seasonFor, type MissionKind } from "@/lib/data/missions";
import { activeMissions, type ActiveMission } from "@/lib/progression/engine";
import { useApp } from "../AppState";
import { Coins, Icon, Progress, ScreenHeader, timeLeft } from "../ui";

const TABS: { kind: MissionKind; label: string }[] = [
  { kind: "daily", label: "Daily" },
  { kind: "weekly", label: "Weekly" },
  { kind: "special", label: "Season" },
];

export default function Missions() {
  const { state, run, setState, toast } = useApp();
  const [tab, setTab] = useState<MissionKind>("daily");
  const [busy, setBusy] = useState<string | null>(null);
  if (!state) return null;
  const now = new Date();
  const all = activeMissions(state, now);
  const list = all.filter((m) => m.def.kind === tab);
  const season = seasonFor(now);

  const claim = async (m: ActiveMission) => {
    setBusy(m.key);
    const s = await run((b) => b.claimMission(m.key));
    setBusy(null);
    if (s) {
      setState(s);
      audio.play("reward");
      toast(`+${m.def.reward.coins} META Coins · +${m.def.reward.xp} XP`, "reward");
    }
  };

  return (
    <div className="pb-6">
      <ScreenHeader title="Missions" subtitle="Progress updates from your real runs" />
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {TABS.map((t) => {
          const n = all.filter((m) => m.def.kind === t.kind && m.completed && !m.claimed).length;
          return (
            <button key={t.kind} onClick={() => setTab(t.kind)} className={`relative rounded-lg py-2 font-display text-xs font-bold uppercase tracking-wider transition ${tab === t.kind ? "bg-gradient-to-r from-mw-purple to-mw-violet text-white" : "text-white/60 hover:text-white"}`}>
              {t.label}
              {n > 0 && <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-mw-pink" />}
            </button>
          );
        })}
      </div>
      {tab === "special" && (
        <div className="panel mb-3 bg-gradient-to-r from-mw-pink/20 to-transparent p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-mw-pink">Limited-time season</div>
          <div className="heading text-base">{season.name}</div>
          <div className="text-xs text-white/60">Ends in {timeLeft(season.endsAt)}</div>
        </div>
      )}
      <div className="space-y-3">
        {list.map((m) => (
          <div key={m.key} className={`panel p-4 ${m.completed && !m.claimed ? "shadow-neon" : ""}`}>
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${m.claimed ? "bg-emerald-400/15 text-emerald-300" : "bg-mw-violet/15 text-mw-violet"}`}>
                <Icon name={m.claimed ? "check" : "target"} className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="heading text-sm">{m.def.title}</div>
                    <div className="text-sm text-white/65">{m.def.description}</div>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <Coins value={m.def.reward.coins} />
                    <div className="text-white/50">+{m.def.reward.xp} XP</div>
                  </div>
                </div>
                <Progress value={m.progress} max={m.def.target} className="mt-3" color={m.completed ? "from-emerald-400 to-mw-cyan" : undefined} />
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/50">
                  <span className="tabular-nums">
                    {m.progress.toLocaleString()} / {m.def.target.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="clock" className="h-3.5 w-3.5" />
                    {timeLeft(m.endsAt)}
                  </span>
                </div>
                {m.completed && !m.claimed && (
                  <button className="btn-gold mt-3 w-full" onClick={() => claim(m)} disabled={busy === m.key} data-testid="claim-mission">
                    Claim reward
                  </button>
                )}
                {m.claimed && <div className="mt-2 text-xs font-bold uppercase tracking-wider text-emerald-300">Claimed</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
