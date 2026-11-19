"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from "react";
import { getCity } from "@/lib/data/cities";
import { levelProgress } from "@/lib/data/rewards";
import { activeMissions, dailyStatus } from "@/lib/progression/engine";
import { useApp, type Screen } from "../AppState";
import { CityArt, Coins, Icon, Progress } from "../ui";

const TILES: { screen: Screen; title: string; sub: string; icon: string; tint: string }[] = [
  { screen: "missions", title: "Missions", sub: "Daily · Weekly · Season", icon: "target", tint: "from-mw-violet/30" },
  { screen: "arena", title: "Arena", sub: "Tournaments", icon: "swords", tint: "from-mw-pink/25" },
  { screen: "leaderboard", title: "Leaderboard", sub: "Global rankings", icon: "trophy", tint: "from-amber-400/25" },
  { screen: "shop", title: "Shop", sub: "Skins & effects", icon: "bag", tint: "from-mw-cyan/25" },
  { screen: "achievements", title: "Achievements", sub: "Milestones", icon: "medal", tint: "from-emerald-400/25" },
  { screen: "profile", title: "Profile", sub: "Stats & level", icon: "user", tint: "from-mw-blue/25" },
];

export default function Home() {
  const { state, go, city, setDailyOpen, dailyOpen, mode } = useApp();
  const autoOpened = useRef(false);
  const now = new Date();
  const daily = state ? dailyStatus(state, now) : null;

  useEffect(() => {
    if (state && daily && !daily.claimedToday && !autoOpened.current && state.stats.gamesPlayed > 0) {
      autoOpened.current = true;
      setDailyOpen(true);
    }
  }, [state, daily, setDailyOpen]);

  if (!state) return null;
  const c = getCity(city);
  const lp = levelProgress(state.xp);
  const missions = activeMissions(state, now);
  const claimable = missions.filter((m) => m.completed && !m.claimed).length;
  const nextMission = missions.find((m) => !m.completed && m.def.kind === "daily");

  return (
    <div className="space-y-4 pb-6">
      {/* Hero */}
      <section className="panel-glow relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-mw-violet/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-mw-cyan/20 blur-3xl" />
        <div className="relative grid grid-cols-[1fr_auto] items-end gap-2 p-5 sm:p-7">
          <div className="min-w-0">
            <div className="chip mb-3 border-mw-cyan/30 text-mw-cyan">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mw-cyan" />
              {mode === "online" ? "Online · Global" : "Offline · This device"}
            </div>
            <h1 className="heading text-3xl leading-none sm:text-5xl">
              <span className="block text-white/90">Metawin</span>
              <span className="text-gradient">Rush</span>
            </h1>
            <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-[0.3em] text-white/55">Run · Collect · Compete · Win</p>
            <button onClick={() => go("game")} className="btn-primary mt-5 animate-pulseGlow px-8 py-4 text-lg" data-testid="play">
              <Icon name="play" className="h-6 w-6" strokeWidth={0} />
              Play
            </button>
          </div>
          <div className="relative animate-floaty">
            <img src="/brand/character.jpg" alt="SKEL — the Metawin runner" className="h-36 w-36 rounded-3xl object-cover shadow-cyan sm:h-52 sm:w-52" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-mw-cyan/50 bg-ink-950/90 px-3 py-0.5 font-display text-xs font-black tracking-[0.3em] text-mw-cyan shadow-cyan">SKEL</div>
          </div>
        </div>
      </section>

      {/* City + level */}
      <section className="grid gap-4 sm:grid-cols-2">
        <button onClick={() => go("cities")} className="panel group relative h-40 overflow-hidden text-left transition hover:shadow-cyan" data-testid="city-card">
          <CityArt cityId={city} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="relative flex h-full flex-col justify-end p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-mw-cyan">Running in</div>
            <div className="heading text-2xl">{c.name}</div>
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>{c.theme}</span>
              <span className="chip">Change city</span>
            </div>
          </div>
        </button>
        <div className="panel flex flex-col justify-between gap-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">Player level</div>
              <div className="heading text-3xl text-gradient">{lp.level}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">Best score</div>
              <div className="font-display text-xl font-bold tabular-nums">{state.stats.highScore.toLocaleString()}</div>
            </div>
          </div>
          <div>
            <Progress value={lp.into} max={lp.needed} />
            <div className="mt-1 flex justify-between text-[11px] text-white/50">
              <span>{lp.into.toLocaleString()} XP</span>
              <span>{lp.needed.toLocaleString()} to level {lp.level + 1}</span>
            </div>
          </div>
          <button onClick={() => setDailyOpen(!dailyOpen)} className={`flex items-center gap-3 rounded-xl border p-2.5 text-left ${daily && !daily.claimedToday ? "border-amber-300/50 bg-amber-400/10" : "border-white/10 bg-white/5"}`}>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-400/20 text-amber-300">
              <Icon name="gift" />
            </div>
            <div className="flex-1 text-sm">
              <div className="font-bold">Daily reward</div>
              <div className="text-xs text-white/60">{daily?.claimedToday ? `Claimed · streak day ${daily.currentDay}` : `Day ${daily?.nextDay} is ready to claim`}</div>
            </div>
            {daily && !daily.claimedToday && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-300" />}
          </button>
        </div>
      </section>

      {nextMission && (
        <button onClick={() => go("missions")} className="panel flex w-full items-center gap-3 p-3 text-left">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-mw-violet/20 text-mw-violet">
            <Icon name="target" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-sm">
              <span className="truncate font-bold">{nextMission.def.description}</span>
              <span className="ml-2 shrink-0 tabular-nums text-white/60">
                {nextMission.progress.toLocaleString()}/{nextMission.def.target.toLocaleString()}
              </span>
            </div>
            <Progress value={nextMission.progress} max={nextMission.def.target} className="mt-1.5" />
          </div>
        </button>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TILES.map((t) => (
          <button key={t.screen} onClick={() => go(t.screen)} className={`panel group relative overflow-hidden bg-gradient-to-br ${t.tint} to-transparent p-4 text-left transition hover:-translate-y-0.5 hover:shadow-neon`} data-testid={`tile-${t.screen}`}>
            <Icon name={t.icon} className="h-7 w-7 text-white/90 transition group-hover:scale-110" />
            <div className="heading mt-3 text-sm">{t.title}</div>
            <div className="text-xs text-white/55">{t.sub}</div>
            {t.screen === "missions" && claimable > 0 && <span className="absolute right-3 top-3 rounded-full bg-mw-pink px-2 py-0.5 text-[10px] font-black">{claimable}</span>}
          </button>
        ))}
      </section>

      <section className="panel flex items-center justify-between p-4 text-sm">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">META Coins</div>
          <Coins value={state.coins} className="text-xl" />
        </div>
        <button onClick={() => go("shop")} className="btn-gold">
          Spend
        </button>
      </section>
    </div>
  );
}
