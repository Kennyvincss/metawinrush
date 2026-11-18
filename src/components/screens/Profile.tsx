"use client";
import { useState } from "react";
import { ACHIEVEMENTS } from "@/lib/data/achievements";
import { CITIES } from "@/lib/data/cities";
import { COSMETICS } from "@/lib/data/cosmetics";
import { levelProgress } from "@/lib/data/rewards";
import { isValidUsername } from "@/lib/progression/state";
import { useApp } from "../AppState";
import { Avatar, Coins, Icon, Progress, ScreenHeader } from "../ui";

export default function Profile() {
  const { state, run, setState, mode, isGuest, userEmail, linkEmail, signOut, go } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state?.username ?? "");
  const [email, setEmail] = useState("");
  if (!state) return null;
  const lp = levelProgress(state.xp);
  const st = state.stats;
  const chars = COSMETICS.filter((c) => c.slot === "character");

  const save = async () => {
    const s = await run((b) => b.rename(name.trim()), "Username updated");
    if (s) {
      setState(s);
      setEditing(false);
    }
  };
  const toggle = async (k: "music" | "sfx") => {
    const s = await run((b) => b.updateSettings({ [k]: !state.settings[k] }));
    if (s) setState(s);
  };

  const stats: [string, string][] = [
    ["Highest score", st.highScore.toLocaleString()],
    ["Games played", st.gamesPlayed.toLocaleString()],
    ["Distance", `${(st.totalDistance / 1000).toFixed(1)} km`],
    ["Coins collected", st.totalCoins.toLocaleString()],
    ["Obstacles passed", st.dodges.toLocaleString()],
    ["Power-ups used", st.powerupsUsed.toLocaleString()],
    ["Longest run", `${Math.floor(st.longestRunMs / 60000)}m ${Math.floor((st.longestRunMs % 60000) / 1000)}s`],
    ["Missions done", st.missionsCompleted.toLocaleString()],
  ];

  return (
    <div className="space-y-4 pb-6">
      <ScreenHeader title="Player profile" subtitle={mode === "online" ? (isGuest ? "Guest account" : userEmail ?? "Signed in") : "Offline profile on this device"} />
      <section className="panel-glow relative overflow-hidden p-5">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative flex items-center gap-4">
          <Avatar characterId={state.equipped.character} helmet={state.equipped.helmet} size={88} className="shadow-cyan" />
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" aria-label="Username" />
                <button className="btn-primary px-3 py-2" disabled={!isValidUsername(name.trim())} onClick={save}>
                  Save
                </button>
              </div>
            ) : (
              <button className="group flex items-center gap-2" onClick={() => setEditing(true)}>
                <span className="heading truncate text-xl">{state.username}</span>
                <Icon name="edit" className="h-4 w-4 text-white/40 group-hover:text-mw-cyan" />
              </button>
            )}
            <div className="mt-1 text-sm text-white/60">Level {lp.level}</div>
            <Progress value={lp.into} max={lp.needed} className="mt-2" />
            <div className="mt-1 text-[11px] text-white/45">
              {state.xp.toLocaleString()} XP total · {(lp.needed - lp.into).toLocaleString()} to next level
            </div>
          </div>
        </div>
        <div className="relative mt-4 flex items-center justify-between rounded-xl bg-black/25 p-3">
          <span className="text-xs uppercase tracking-wider text-white/50">Balance</span>
          <Coins value={state.coins} className="text-lg" />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="panel p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/45">{k}</div>
            <div className="font-display text-base font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </section>

      <section className="panel p-4">
        <div className="heading mb-3 text-sm">Cities · {state.unlockedCities.length}/{CITIES.length}</div>
        <div className="flex flex-wrap gap-1.5">
          {CITIES.map((c) => (
            <span key={c.id} className={`chip ${state.unlockedCities.includes(c.id) ? "border-mw-cyan/40 text-white" : "text-white/35"}`}>
              {!state.unlockedCities.includes(c.id) && <Icon name="lock" className="h-3 w-3" />}
              {c.name}
              {st.cityStats[c.id] && <span className="text-white/45">· {st.cityStats[c.id]!.best.toLocaleString()}</span>}
            </span>
          ))}
        </div>
      </section>

      <section className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="heading text-sm">
            Characters · {chars.filter((c) => state.inventory.includes(c.id)).length}/{chars.length}
          </div>
          <button className="text-xs font-bold text-mw-cyan" onClick={() => go("shop")}>
            Shop
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {chars.map((c) => (
            <div key={c.id} className={`rounded-xl border p-0.5 ${state.inventory.includes(c.id) ? "border-mw-violet/50" : "border-white/5 opacity-30 grayscale"}`} title={c.name}>
              <Avatar characterId={c.id} size={44} />
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="heading text-sm">
            Achievements · {Object.keys(state.achievements).length}/{ACHIEVEMENTS.length}
          </div>
          <button className="text-xs font-bold text-mw-cyan" onClick={() => go("achievements")}>
            View all
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.id} title={a.title} className={`grid h-10 w-10 place-items-center rounded-xl ${state.achievements[a.id] ? "bg-gradient-to-br from-amber-300 to-orange-500 text-ink-950" : "bg-white/5 text-white/25"}`}>
              <Icon name={a.icon} className="h-5 w-5" />
            </div>
          ))}
        </div>
      </section>

      <section className="panel space-y-2 p-4">
        <div className="heading mb-1 text-sm">Settings</div>
        {(["music", "sfx"] as const).map((k) => (
          <button key={k} onClick={() => toggle(k)} className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm">
            <span className="flex items-center gap-2">
              <Icon name={k === "music" ? "music" : state.settings.sfx ? "sound" : "mute"} />
              {k === "music" ? "Music" : "Sound effects"}
            </span>
            <span className={`h-6 w-11 rounded-full p-0.5 transition ${state.settings[k] ? "bg-mw-violet" : "bg-white/15"}`}>
              <span className={`block h-5 w-5 rounded-full bg-white transition ${state.settings[k] ? "translate-x-5" : ""}`} />
            </span>
          </button>
        ))}
        <button
          className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm"
          onClick={async () => {
            const s = await run((b) => b.updateSettings({ tutorialDone: false }), "Tutorial will play on your next run");
            if (s) setState(s);
          }}
        >
          <Icon name="replay" /> Replay the swipe tutorial
        </button>
        {mode === "online" && isGuest && (
          <div className="rounded-xl border border-mw-cyan/30 bg-mw-cyan/5 p-3">
            <div className="text-sm font-bold">Secure your progress</div>
            <p className="mb-2 text-xs text-white/60">Guest progress lives on this browser's session. Link an email to keep it on any device.</p>
            <div className="flex gap-2">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
              <button className="btn-primary px-3 py-2" disabled={!email.includes("@")} onClick={() => linkEmail(email)}>
                Link
              </button>
            </div>
          </div>
        )}
        {mode === "online" && (
          <button className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm text-red-200" onClick={signOut}>
            <Icon name="logout" /> Sign out
          </button>
        )}
      </section>
    </div>
  );
}
