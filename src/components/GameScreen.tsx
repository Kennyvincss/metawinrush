"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "@/game/audio/engine";
import { POWERUP_COLORS } from "@/game/art/props";
import type { GameController } from "@/game";
import type { GameAction, HudState, TutorialStep } from "@/game/types";
import { getCity } from "@/lib/data/cities";
import { getItem, getLook } from "@/lib/data/cosmetics";
import { activeMissions, type RunOutcome } from "@/lib/progression/engine";
import type { PowerUpKind, RunResult } from "@/lib/rules";
import { shareScorecard } from "@/lib/share";
import { useApp } from "./AppState";
import { Coins, Icon, Progress } from "./ui";

type Phase = "loading" | "playing" | "paused" | "submitting" | "over" | "error";

const POWER_LABEL: Record<PowerUpKind, string> = { magnet: "Magnet", shield: "Shield", scoreboost: "Score ×2", coinboost: "Coins ×2", superjump: "Super Jump" };

const HUD_METRIC: Partial<Record<string, (h: HudState) => number>> = {
  coins: (h) => h.coins,
  distance: (h) => h.distance,
  powerups: (h) => h.powerupsUsed,
  score_total: (h) => h.score,
  score_best: (h) => h.score,
  survive_seconds: (h) => Math.floor(h.elapsedMs / 1000),
  jumps: (h) => h.jumps,
  slides: (h) => h.slides,
  dodges: (h) => h.dodges,
};

export default function GameScreen() {
  const { state, city, backend, go, setState, toast } = useApp();
  const mount = useRef<HTMLDivElement>(null);
  const ctrl = useRef<GameController | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [hud, setHud] = useState<HudState | null>(null);
  const [tutorial, setTutorial] = useState<TutorialStep>(null);
  const [titleCard, setTitleCard] = useState(true);
  const [result, setResult] = useState<RunResult | null>(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [event, setEvent] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const cityDef = getCity(city);

  const begin = useCallback(async () => {
    const s = stateRef.current;
    if (!s || !backend || !ctrl.current) return;
    setPhase("loading");
    setHud(null);
    setResult(null);
    setOutcome(null);
    setSubmitError(null);
    setTutorial(null);
    setTitleCard(true);
    try {
      // The 3D runner model (~2 MB) loads once and is reused; falls back to 2D sprites if unavailable.
      const [{ Character3D }, { sessionId, seed }] = await Promise.all([import("@/game/character3d"), backend.startRun(city)]);
      await Character3D.load();
      const eq = s.equipped;
      ctrl.current.start(
        {
          city,
          sessionId,
          seed,
          look: getLook(eq.character),
          characterId: eq.character,
          helmet: eq.helmet,
          trail: eq.trail,
          jumpfx: eq.jumpfx,
          slidefx: eq.slidefx,
          emote: eq.emote,
          tutorial: !s.settings.tutorialDone,
          music: s.settings.music,
          sfx: s.settings.sfx,
        },
        {
          onReady: () => {
            setPhase("playing");
            setTimeout(() => setTitleCard(false), 1700);
          },
          onHud: setHud,
          onTutorial: (t) => {
            setTutorial(t);
            if (t && "done" in t) {
              setTimeout(() => setTutorial(null), 2200);
              void backend.updateSettings({ tutorialDone: true }).then(setState).catch(() => {});
            }
          },
          onPauseRequest: () => {
            if (!ctrl.current?.isPaused()) {
              ctrl.current?.pause();
              setPhase((p) => (p === "playing" ? "paused" : p));
            }
          },
          onEvent: (e) => {
            if (e.type === "powerup") setEvent(POWER_LABEL[e.kind]);
            else if (e.type === "shieldBreak") setEvent("Shield saved you!");
            else if (e.type === "stumble") setEvent("Stumble! Careful…");
            setTimeout(() => setEvent(null), 1300);
          },
          onEnd: async (r) => {
            setResult(r);
            setPhase("submitting");
            try {
              const out = await backend.finishRun(r);
              setState(out.state);
              setOutcome(out.outcome);
              if (out.outcome.levelAfter > out.outcome.levelBefore) audio.play("levelup");
              else if (out.outcome.newBest) audio.play("reward");
            } catch (e) {
              setSubmitError(e instanceof Error ? e.message : String(e));
            }
            setPhase("over");
          },
        },
      );
      setRunId((n) => n + 1);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, [backend, city, setState]);

  useEffect(() => {
    let disposed = false;
    audio.unlock();
    void import("@/game").then(({ createGame }) => {
      if (disposed || !mount.current) return;
      ctrl.current = createGame(mount.current);
      void begin();
    });
    return () => {
      disposed = true;
      ctrl.current?.destroy();
      ctrl.current = null;
      audio.playMusic("menu");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = () => {
    ctrl.current?.pause();
    setPhase("paused");
    audio.play("click");
  };
  const resume = () => {
    setPhase("playing");
    ctrl.current?.resume();
  };

  // Live mission tracker: stored progress + this run's contribution.
  const tracked = (() => {
    if (!state || !hud) return null;
    const m = activeMissions(state, new Date()).find((x) => !x.completed && HUD_METRIC[x.def.metric] && (!x.def.city || x.def.city === city));
    if (!m) return null;
    const runVal = HUD_METRIC[m.def.metric]!(hud);
    const max = m.def.metric === "score_best" || m.def.metric === "survive_seconds";
    return { m, value: Math.min(m.def.target, max ? Math.max(m.progress, runVal) : m.progress + runVal) };
  })();

  return (
    <div className="fixed inset-0 z-40 select-none overflow-hidden bg-black" style={{ touchAction: "none" }}>
      <div ref={mount} className="absolute inset-0" data-testid="game-canvas" />

      {/* Title card / city transition */}
      {titleCard && phase !== "error" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="animate-pop text-center">
            <div className="font-display text-[11px] font-bold uppercase tracking-[0.5em] text-mw-cyan">{cityDef.theme}</div>
            <div className="heading text-5xl drop-shadow-[0_0_24px_rgba(180,77,255,.8)] sm:text-6xl">{cityDef.name}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.3em] text-white/60">{cityDef.tagline}</div>
          </div>
        </div>
      )}

      {/* HUD */}
      {hud && (phase === "playing" || phase === "paused") && (
        <div className="pointer-events-none absolute inset-x-0 top-0 p-3" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
          <div className="flex items-start justify-between gap-2">
            <div className="rounded-2xl bg-black/35 px-3 py-2 backdrop-blur-sm">
              <div className="font-display text-2xl font-black tabular-nums leading-none sm:text-3xl" data-testid="hud-score">
                {hud.score.toLocaleString()}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-white/70">
                <span className="rounded bg-mw-violet/40 px-1.5 py-0.5 text-white">×{hud.multiplier.toFixed(1)}</span>
                <span className="tabular-nums">{hud.distance.toLocaleString()} m</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="rounded-2xl bg-black/35 px-3 py-2 backdrop-blur-sm">
                <Coins value={hud.coins} className="text-lg" />
              </div>
              <button onClick={pause} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-2xl bg-black/45 backdrop-blur-sm active:scale-95" aria-label="Pause" data-testid="pause">
                <Icon name="pause" className="h-5 w-5" strokeWidth={0} />
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-col items-start gap-1.5">
            {hud.powerups.map((p) => (
              <div key={p.kind} className="flex w-40 items-center gap-2 rounded-xl bg-black/40 px-2 py-1 backdrop-blur-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: POWERUP_COLORS[p.kind], boxShadow: `0 0 10px ${POWERUP_COLORS[p.kind]}` }} />
                <span className="flex-1 text-[11px] font-bold">{POWER_LABEL[p.kind]}</span>
                <div className="h-1.5 w-12 overflow-hidden rounded bg-white/15">
                  <div className="h-full" style={{ width: `${(p.remaining / p.total) * 100}%`, background: POWERUP_COLORS[p.kind] }} />
                </div>
              </div>
            ))}
          </div>
          {tracked && (
            <div className="absolute left-1/2 top-[max(12px,env(safe-area-inset-top))] mt-16 w-56 -translate-x-1/2 rounded-xl bg-black/35 px-3 py-1.5 backdrop-blur-sm sm:mt-0">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="truncate text-white/80">{tracked.m.def.title}</span>
                <span className="tabular-nums text-white/60">
                  {tracked.value.toLocaleString()}/{tracked.m.def.target.toLocaleString()}
                </span>
              </div>
              <Progress value={tracked.value} max={tracked.m.def.target} className="mt-1 h-1" />
            </div>
          )}
        </div>
      )}

      {event && phase === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
          <span className="heading animate-pop text-2xl drop-shadow-[0_0_18px_rgba(56,232,255,.9)]">{event}</span>
        </div>
      )}

      {tutorial && <TutorialOverlay step={tutorial} onAction={(a) => ctrl.current?.action(a)} />}

      {phase === "loading" && !titleCard && (
        <div className="absolute inset-0 grid place-items-center bg-black/60">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-mw-cyan border-t-transparent" />
        </div>
      )}

      {phase === "paused" && state && (
        <div className="absolute inset-0 grid place-items-center bg-black/65 p-6 backdrop-blur-sm">
          <div className="panel-glow w-full max-w-xs animate-pop space-y-3 p-5 text-center">
            <div className="heading text-2xl">Paused</div>
            <button className="btn-primary w-full py-3" onClick={resume} data-testid="resume">
              <Icon name="play" strokeWidth={0} /> Resume
            </button>
            <button className="btn-ghost w-full" onClick={() => void begin()}>
              <Icon name="replay" /> Restart
            </button>
            <div className="grid grid-cols-2 gap-2">
              {(["music", "sfx"] as const).map((k) => (
                <button
                  key={k}
                  className={`btn-ghost px-2 text-xs ${state.settings[k] ? "" : "opacity-50"}`}
                  onClick={async () => {
                    const s = await backend!.updateSettings({ [k]: !state.settings[k] }).catch(() => null);
                    if (s) {
                      setState(s);
                      ctrl.current?.setAudio(s.settings.music, s.settings.sfx);
                    }
                  }}
                >
                  <Icon name={k === "music" ? "music" : state.settings.sfx ? "sound" : "mute"} className="h-4 w-4" />
                  {k === "music" ? "Music" : "Sound"} {state.settings[k] ? "on" : "off"}
                </button>
              ))}
            </div>
            <button className="btn-ghost w-full text-red-200" onClick={() => go("home")}>
              Quit to dashboard
            </button>
          </div>
        </div>
      )}

      {phase === "submitting" && (
        <div className="absolute inset-0 grid place-items-center bg-black/50">
          <div className="heading animate-pulse text-xl">Validating run…</div>
        </div>
      )}

      {phase === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-6">
          <div className="panel w-full max-w-xs space-y-3 p-5 text-center">
            <div className="heading">Couldn't start the run</div>
            <p className="text-sm text-white/60">{submitError}</p>
            <button className="btn-primary w-full" onClick={() => void begin()}>
              Try again
            </button>
            <button className="btn-ghost w-full" onClick={() => go("home")}>
              Dashboard
            </button>
          </div>
        </div>
      )}

      {phase === "over" && result && state && (
        <GameOver
          key={runId}
          result={result}
          outcome={outcome}
          error={submitError}
          onAgain={() => void begin()}
          onHome={() => go("home")}
          onShare={async () => {
            await shareScorecard({
              username: state.username,
              score: result.score,
              distance: result.distance,
              coins: result.coins,
              city: result.city,
              characterId: state.equipped.character,
              helmet: state.equipped.helmet,
              newBest: outcome?.newBest,
              rank: outcome?.rank,
            });
            toast("Score card ready to share", "success");
          }}
        />
      )}
    </div>
  );
}

function TutorialOverlay({ step, onAction }: { step: NonNullable<TutorialStep>; onAction(a: GameAction): void }) {
  if ("done" in step)
    return (
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="panel-glow animate-pop px-6 py-4 text-center">
          <div className="heading text-2xl text-gradient">You're ready!</div>
          <div className="text-sm text-white/70">Collect coins, dodge everything. Good luck.</div>
        </div>
      </div>
    );
  const dir = { left: ["-90px", "0px", "back", "←  /  A"], right: ["90px", "0px", "back", "→  /  D"], jump: ["0px", "-90px", "back", "↑  /  W  /  Space"], slide: ["0px", "90px", "back", "↓  /  S"] }[step.action];
  const rot = { left: 0, right: 180, jump: 90, slide: -90 }[step.action];
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/10 via-black/45 to-black/10">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-mw-cyan">
        Tutorial {step.index + 1}/{step.total}
      </div>
      <div className="heading px-6 text-center text-2xl drop-shadow-[0_0_14px_rgba(180,77,255,.9)] sm:text-3xl" data-testid="tutorial-text">
        {step.text}
      </div>
      <div className="relative mt-10 h-24 w-24">
        <div className="absolute inset-0 grid animate-swipe place-items-center" style={{ ["--sx" as string]: dir[0], ["--sy" as string]: dir[1] }}>
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-white/80 bg-white/20 shadow-[0_0_30px_rgba(56,232,255,.8)]">
            <span style={{ transform: `rotate(${rot}deg)` }}>
              <Icon name={dir[2]} className="h-8 w-8" strokeWidth={3} />
            </span>
          </div>
        </div>
      </div>
      <div className="mt-8 text-xs text-white/60">
        Swipe anywhere · Keyboard: <span className="font-bold text-white/85">{dir[3]}</span>
      </div>
      {/* Swipes are captured by the game layer underneath; this invisible button helps screen-reader and switch users. */}
      <button className="pointer-events-auto sr-only" onClick={() => onAction(step.action)}>
        {step.text}
      </button>
    </div>
  );
}

function GameOver({ result, outcome, error, onAgain, onHome, onShare }: { result: RunResult; outcome: RunOutcome | null; error: string | null; onAgain(): void; onHome(): void; onShare(): void }) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-black/60 via-ink-950/90 to-ink-950 p-4" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }} data-testid="game-over">
      <div className="mx-auto max-w-md animate-rise space-y-3 pb-8">
        <div className="pt-6 text-center">
          <div className="font-display text-xs font-bold uppercase tracking-[0.4em] text-mw-pink">Crashed in {getCity(result.city).name}</div>
          {outcome?.newBest && <div className="mx-auto mt-3 w-fit animate-pop rounded-full bg-gradient-to-r from-amber-300 to-mw-pink px-4 py-1 font-display text-xs font-black uppercase tracking-widest text-ink-950">New personal best</div>}
          <div className="heading mt-2 text-6xl tabular-nums text-gradient" data-testid="final-score">
            {result.score.toLocaleString()}
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/50">Final score</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Tile label="META Coins" value={<Coins value={result.coins} />} />
          <Tile label="Distance" value={`${result.distance.toLocaleString()} m`} />
          <Tile label="XP earned" value={outcome ? `+${outcome.xpEarned}` : "—"} />
          <Tile label="Leaderboard" value={outcome?.rank ? `#${outcome.rank}` : "—"} />
        </div>

        {error && (
          <div className="panel border-red-400/40 p-3 text-sm text-red-200">
            <b>Run not recorded:</b> {error}
          </div>
        )}

        {outcome && outcome.levelAfter > outcome.levelBefore && (
          <div className="panel-glow flex items-center gap-3 p-3">
            <Icon name="star" className="h-6 w-6 text-amber-300" />
            <div className="text-sm font-bold">Level up! You reached level {outcome.levelAfter}</div>
          </div>
        )}
        {outcome && outcome.completedMissions.length > 0 && (
          <div className="panel p-3">
            <div className="heading mb-2 text-xs text-mw-cyan">Missions completed</div>
            {outcome.completedMissions.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1 text-sm">
                <span className="flex items-center gap-2">
                  <Icon name="check" className="h-4 w-4 text-emerald-300" /> {m.title}
                </span>
                <span className="text-xs text-white/50">claim in Missions</span>
              </div>
            ))}
          </div>
        )}
        {outcome && (outcome.unlockedAchievements.length > 0 || outcome.unlockedCities.length > 0 || outcome.grantedItems.length > 0) && (
          <div className="panel p-3 text-sm">
            <div className="heading mb-2 text-xs text-amber-300">Unlocked</div>
            {outcome.unlockedAchievements.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-0.5">
                <Icon name="medal" className="h-4 w-4 text-amber-300" /> {a.title}
              </div>
            ))}
            {outcome.unlockedCities.map((c) => (
              <div key={c} className="flex items-center gap-2 py-0.5">
                <Icon name="city" className="h-4 w-4 text-mw-cyan" /> New city: {getCity(c).name}
              </div>
            ))}
            {outcome.grantedItems.map((i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <Icon name="gift" className="h-4 w-4 text-mw-pink" /> {getItem(i)?.name}
              </div>
            ))}
          </div>
        )}

        <button className="btn-primary w-full py-4 text-lg" onClick={onAgain} data-testid="play-again">
          <Icon name="replay" /> Play again
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={onHome}>
            <Icon name="home" /> Dashboard
          </button>
          <button className="btn-ghost" onClick={onShare}>
            <Icon name="share" /> Share score
          </button>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="panel p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/45">{label}</div>
      <div className="font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
