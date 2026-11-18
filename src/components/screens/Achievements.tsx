"use client";
import { ACHIEVEMENTS } from "@/lib/data/achievements";
import { achievementProgress } from "@/lib/progression/engine";
import { useApp } from "../AppState";
import { Coins, Icon, Progress, ScreenHeader } from "../ui";

export default function Achievements() {
  const { state } = useApp();
  if (!state) return null;
  const done = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;
  return (
    <div className="pb-6">
      <ScreenHeader title="Achievements" subtitle={`${done} of ${ACHIEVEMENTS.length} unlocked · rewards are granted automatically`} />
      <Progress value={done} max={ACHIEVEMENTS.length} className="mb-4 h-2.5" color="from-amber-300 to-mw-pink" />
      <div className="grid gap-3 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const got = state.achievements[a.id];
          const p = Math.min(a.target, achievementProgress(state, a));
          return (
            <div key={a.id} className={`panel flex gap-3 p-4 ${got ? "border-amber-300/30 bg-gradient-to-br from-amber-400/10 to-transparent" : ""}`}>
              <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${got ? "bg-gradient-to-br from-amber-300 to-orange-500 text-ink-950 shadow-[0_0_24px_rgba(255,200,80,.35)]" : "bg-white/5 text-white/40"}`}>
                <Icon name={a.icon} className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="heading text-sm">{a.title}</div>
                  {got ? <Icon name="check" className="h-5 w-5 text-amber-300" /> : <Icon name="lock" className="h-4 w-4 text-white/30" />}
                </div>
                <div className="text-xs text-white/60">{a.description}</div>
                <Progress value={p} max={a.target} className="mt-2" color={got ? "from-amber-300 to-orange-400" : undefined} />
                <div className="mt-1 flex justify-between text-[11px] text-white/45">
                  <span className="tabular-nums">
                    {p.toLocaleString()} / {a.target.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-2">
                    {a.reward.coins > 0 && <Coins value={a.reward.coins} className="text-[11px]" />}
                    {a.reward.xp > 0 && <span>+{a.reward.xp} XP</span>}
                  </span>
                </div>
                {got && <div className="mt-1 text-[11px] text-amber-200/70">Unlocked {new Date(got.unlockedAt).toLocaleDateString()}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
