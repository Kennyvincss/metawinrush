"use client";
import { levelForXp } from "@/lib/data/rewards";
import { AppProvider, useApp, type Screen } from "./AppState";
import DailyRewards from "./DailyRewards";
import GameScreen from "./GameScreen";
import Achievements from "./screens/Achievements";
import Arena from "./screens/Arena";
import Cities from "./screens/Cities";
import Home from "./screens/Home";
import Leaderboard from "./screens/Leaderboard";
import Missions from "./screens/Missions";
import Profile from "./screens/Profile";
import Shop from "./screens/Shop";
import { Avatar, Coins, Icon, Logo, Toasts } from "./ui";
import Welcome from "./Welcome";

const NAV: { screen: Screen; label: string; icon: string }[] = [
  { screen: "home", label: "Home", icon: "home" },
  { screen: "cities", label: "Cities", icon: "city" },
  { screen: "arena", label: "Arena", icon: "swords" },
  { screen: "shop", label: "Shop", icon: "bag" },
  { screen: "profile", label: "Profile", icon: "user" },
];

function Shell() {
  const { status, error, state, screen, go, reload } = useApp();

  if (status === "loading" && !state)
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <div className="flex flex-col items-center gap-4">
          <Logo size={72} />
          <div className="heading animate-pulse text-sm tracking-[0.4em] text-white/60">Loading</div>
        </div>
      </div>
    );
  if (status === "needs-auth") return <Welcome />;
  if (status === "error" || !state)
    return (
      <div className="grid min-h-[100dvh] place-items-center p-6">
        <div className="panel max-w-sm space-y-3 p-6 text-center">
          <div className="heading">Connection problem</div>
          <p className="text-sm text-white/60">{error ?? "Could not load your player profile."}</p>
          <button className="btn-primary w-full" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      </div>
    );

  if (screen === "game") return <GameScreen />;

  const level = levelForXp(state.xp);
  return (
    <div className="relative min-h-[100dvh]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(139,63,214,.25),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(56,232,255,.12),transparent_55%)]" />
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <button onClick={() => go("home")} className="flex items-center gap-2.5" aria-label="Home">
            <Logo size={36} />
            <span className="heading hidden text-sm sm:block">
              Metawin <span className="text-gradient">Rush</span>
            </span>
          </button>
          <div className="flex-1" />
          <Coins value={state.coins} className="rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-1 text-sm" />
          <button onClick={() => go("profile")} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3" aria-label="Profile">
            <Avatar characterId={state.equipped.character} helmet={state.equipped.helmet} size={28} className="!rounded-full" />
            <span className="text-xs font-bold">Lv {level}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 sm:pb-10">
        <div key={screen} className="animate-rise">
          {screen === "home" && <Home />}
          {screen === "cities" && <Cities />}
          {screen === "missions" && <Missions />}
          {screen === "leaderboard" && <Leaderboard />}
          {screen === "arena" && <Arena />}
          {screen === "shop" && <Shop />}
          {screen === "achievements" && <Achievements />}
          {screen === "profile" && <Profile />}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-950/90 backdrop-blur sm:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5">
          {NAV.map((n) => (
            <button key={n.screen} onClick={() => go(n.screen)} className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold uppercase tracking-wider ${screen === n.screen ? "text-mw-cyan" : "text-white/50"}`}>
              <Icon name={n.icon} className="h-5 w-5" />
              {n.label}
            </button>
          ))}
        </div>
      </nav>
      <DailyRewards />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
      <Toasts />
    </AppProvider>
  );
}
