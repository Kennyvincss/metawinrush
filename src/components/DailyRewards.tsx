"use client";
import { useState } from "react";
import { audio } from "@/game/audio/engine";
import { getItem } from "@/lib/data/cosmetics";
import { DAILY_REWARDS } from "@/lib/data/rewards";
import { dailyStatus } from "@/lib/progression/engine";
import { useApp } from "./AppState";
import { CoinIcon, Coins, Icon, Modal } from "./ui";

export default function DailyRewards() {
  const { state, dailyOpen, setDailyOpen, run, setState } = useApp();
  const [claimed, setClaimed] = useState<{ day: number; coins: number; itemId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!state) return null;
  const st = dailyStatus(state, new Date());
  const highlight = st.claimedToday ? st.currentDay : st.nextDay;

  const claim = async () => {
    setBusy(true);
    const out = await run((b) => b.claimDaily());
    setBusy(false);
    if (out) {
      setState(out.state);
      setClaimed(out.reward);
      audio.play("reward");
    }
  };

  return (
    <Modal
      open={dailyOpen}
      onClose={() => {
        setDailyOpen(false);
        setClaimed(null);
      }}
      title="Daily rewards"
    >
      <p className="mb-4 text-sm text-white/60">Come back every day. Miss a day and the streak restarts at Day 1.</p>
      <div className="grid grid-cols-4 gap-2">
        {DAILY_REWARDS.map((r) => {
          const past = st.claimedToday ? r.day <= st.currentDay : r.day < st.nextDay;
          const isToday = r.day === highlight;
          return (
            <div
              key={r.day}
              className={`relative flex flex-col items-center gap-1 rounded-xl border p-2 text-center ${r.day === 7 ? "col-span-2 bg-gradient-to-br from-amber-400/20 to-mw-pink/15" : ""} ${
                isToday ? "border-amber-300 shadow-[0_0_20px_rgba(255,210,63,.35)]" : past ? "border-emerald-400/30 bg-emerald-400/5" : "border-white/10 bg-white/5"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/55">Day {r.day}</div>
              {r.itemId ? <Icon name="crown" className="h-7 w-7 text-amber-300" /> : <CoinIcon className="h-7 w-7" />}
              <div className="text-xs font-bold">{r.itemId ? getItem(r.itemId)?.name : r.coins}</div>
              {past && (
                <div className="absolute right-1 top-1 text-emerald-300">
                  <Icon name="check" className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {claimed ? (
        <div className="mt-5 animate-pop rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-400/20 to-transparent p-5 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-amber-200">Day {claimed.day} claimed</div>
          {claimed.itemId ? <div className="heading mt-2 text-lg text-gradient">{getItem(claimed.itemId)?.name} unlocked!</div> : <Coins value={claimed.coins} className="mt-2 text-3xl" />}
        </div>
      ) : (
        <button className="btn-gold mt-5 w-full py-3.5 text-base" disabled={st.claimedToday || busy} onClick={claim} data-testid="claim-daily">
          {st.claimedToday ? "Come back tomorrow" : `Claim day ${st.nextDay}`}
        </button>
      )}
    </Modal>
  );
}
