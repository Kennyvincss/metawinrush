"use client";
import { CITIES, describeUnlock, type CityDef } from "@/lib/data/cities";
import { cityUnlockProgress } from "@/lib/progression/engine";
import { useApp } from "../AppState";
import { CityArt, Coins, Icon, Progress, ScreenHeader } from "../ui";

const DIFF_COLOR: Record<CityDef["difficultyLabel"], string> = {
  Easy: "text-emerald-300 border-emerald-300/30",
  Medium: "text-sky-300 border-sky-300/30",
  Hard: "text-amber-300 border-amber-300/30",
  Extreme: "text-rose-300 border-rose-300/30",
};

export default function Cities() {
  const { state, city, setCity, go, run, setState, toast } = useApp();
  if (!state) return null;

  const buy = async (c: CityDef) => {
    const s = await run((b) => b.buyCity(c.id));
    if (s) {
      setState(s);
      setCity(c.id);
      toast(`${c.name} unlocked!`, "reward");
    }
  };

  return (
    <div className="pb-6">
      <ScreenHeader title="Choose your city" subtitle={`${state.unlockedCities.length} of ${CITIES.length} unlocked`} />
      <div className="grid gap-4 sm:grid-cols-2">
        {CITIES.map((c, i) => {
          const unlocked = state.unlockedCities.includes(c.id);
          const selected = c.id === city;
          const prog = cityUnlockProgress(state, c.id);
          const cs = state.stats.cityStats[c.id];
          return (
            <div key={c.id} className={`panel relative overflow-hidden transition ${selected ? "shadow-cyan" : ""}`} style={{ animationDelay: `${i * 40}ms` }} data-testid={`city-${c.id}`}>
              <div className="relative h-36">
                <CityArt cityId={c.id} locked={!unlocked} className="absolute inset-0 h-full w-full" />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <span className={`chip bg-black/40 ${DIFF_COLOR[c.difficultyLabel]}`}>{c.difficultyLabel}</span>
                  {selected && <span className="chip border-mw-cyan/50 bg-black/40 text-mw-cyan">Selected</span>}
                </div>
                {!unlocked && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/50">
                      <Icon name="lock" className="h-6 w-6" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-3 right-3">
                  <div className="heading text-xl">{c.name}</div>
                  <div className="text-xs text-white/70">
                    {c.country} · {c.theme}
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-3">
                <p className="text-xs leading-relaxed text-white/60">{c.description}</p>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-white/55">
                  <span className="chip">
                    <Icon name="music" className="h-3.5 w-3.5" /> {c.musicLabel}
                  </span>
                  {cs && <span className="chip">Best {cs.best.toLocaleString()}</span>}
                </div>
                {unlocked ? (
                  <div className="flex gap-2">
                    <button
                      className="btn-ghost flex-1"
                      onClick={() => {
                        setCity(c.id);
                        go("home");
                      }}
                      disabled={selected}
                    >
                      {selected ? "Selected" : "Select"}
                    </button>
                    <button
                      className="btn-primary flex-1"
                      onClick={() => {
                        setCity(c.id);
                        go("game");
                      }}
                      data-testid={`run-${c.id}`}
                    >
                      <Icon name="play" className="h-4 w-4" strokeWidth={0} /> Run
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                      <Icon name="lock" className="h-4 w-4 text-mw-violet" />
                      {describeUnlock(c.unlock)}
                    </div>
                    {c.unlock.type === "coins" ? (
                      <button className="btn-gold w-full" disabled={state.coins < c.unlock.value} onClick={() => buy(c)}>
                        Unlock for <Coins value={c.unlock.value} className="text-ink-950" />
                      </button>
                    ) : (
                      <>
                        <Progress value={prog.current} max={prog.target} />
                        <div className="text-right text-[11px] tabular-nums text-white/50">
                          {Math.min(prog.current, prog.target).toLocaleString()} / {prog.target.toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
