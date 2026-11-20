// Entry point that mounts the Phaser runner into a DOM element and wires swipe + keyboard input.
import * as Phaser from "phaser";
import { audio } from "./audio/engine";
import { RunScene } from "./RunScene";
import type { GameAction, GameCallbacks, LaunchConfig } from "./types";

export interface GameController {
  start(cfg: LaunchConfig, cb: GameCallbacks): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  action(a: GameAction): void;
  setAudio(music: boolean, sfx: boolean): void;
  destroy(): void;
}

// Swipe tuning (CSS px). Up/down keep the original light threshold; left/right need a longer,
// clearly horizontal drag so lane changes don't fire by accident, and each touch moves one lane at most.
const SWIPE_V = 26; // jump / slide
const SWIPE_H = 48; // lane change
const SWIPE_H_RATIO = 1.3; // horizontal drag must clearly dominate the vertical drift
const SWIPE_MAX_MS = 700;

export function createGame(parent: HTMLElement): GameController {
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  const size = () => ({ w: Math.max(1, parent.clientWidth), h: Math.max(1, parent.clientHeight) });
  const s0 = size();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: s0.w * dpr(),
    height: s0.h * dpr(),
    backgroundColor: "#05030b",
    scale: { mode: Phaser.Scale.NONE },
    render: { antialias: true, powerPreference: "high-performance", roundPixels: false },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: true },
    banner: false,
    scene: [],
  });

  const fitCanvas = () => {
    if (!game.isBooted || !game.canvas) return;
    const { w, h } = size();
    const r = dpr();
    game.scale.resize(Math.round(w * r), Math.round(h * r));
    game.canvas.style.width = `${w}px`;
    game.canvas.style.height = `${h}px`;
  };
  const ro = new ResizeObserver(() => fitCanvas());
  ro.observe(parent);
  game.events.once(Phaser.Core.Events.READY, fitCanvas);

  let paused = false;
  let scene: RunScene | null = null;
  let callbacks: GameCallbacks | null = null;

  const act = (a: GameAction) => {
    if (paused || !scene) return;
    audio.unlock();
    scene.action(a);
  };

  // ── Swipe detection (no on-screen buttons) ────────────────────────────
  let sx = 0,
    sy = 0,
    st = 0,
    tracking = false,
    pointerId = -1,
    laneDone = false; // one lane change per touch
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    tracking = true;
    pointerId = e.pointerId;
    sx = e.clientX;
    sy = e.clientY;
    st = performance.now();
    laneDone = false;
    audio.unlock();
  };
  const onMove = (e: PointerEvent) => {
    if (!tracking || e.pointerId !== pointerId) return;
    e.preventDefault();
    const dx = e.clientX - sx,
      dy = e.clientY - sy;
    const adx = Math.abs(dx),
      ady = Math.abs(dy);
    if (Math.max(adx, ady) < SWIPE_V) return;
    if (performance.now() - st > SWIPE_MAX_MS) {
      // slow drag: re-anchor so a later flick still registers
      sx = e.clientX;
      sy = e.clientY;
      st = performance.now();
      return;
    }
    if (ady >= adx) act(dy < 0 ? "jump" : "slide");
    else {
      // horizontal: needs a longer, clearly sideways drag, and only one lane change per touch
      if (laneDone || adx < SWIPE_H || adx < ady * SWIPE_H_RATIO) return;
      act(dx < 0 ? "left" : "right");
      laneDone = true;
    }
    // allow chained swipes in one touch: re-anchor at the current point
    sx = e.clientX;
    sy = e.clientY;
    st = performance.now();
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId === pointerId) tracking = false;
  };
  const block = (e: Event) => e.preventDefault();
  parent.style.touchAction = "none";
  parent.addEventListener("pointerdown", onDown);
  parent.addEventListener("pointermove", onMove, { passive: false });
  parent.addEventListener("pointerup", onUp);
  parent.addEventListener("pointercancel", onUp);
  parent.addEventListener("touchmove", block, { passive: false });
  parent.addEventListener("contextmenu", block);

  // ── Keyboard ──────────────────────────────────────────────────────────
  const keys: Record<string, GameAction> = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "jump",
    KeyW: "jump",
    Space: "jump",
    ArrowDown: "slide",
    KeyS: "slide",
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.code === "Escape" || e.code === "KeyP") {
      e.preventDefault();
      callbacks?.onPauseRequest();
      return;
    }
    const a = keys[e.code];
    if (!a) return;
    e.preventDefault();
    if (e.repeat) return;
    act(a);
  };
  window.addEventListener("keydown", onKey);

  const onVisibility = () => {
    if (document.hidden && scene && !paused) callbacks?.onPauseRequest();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return {
    start(cfg, cb) {
      callbacks = cb;
      paused = false;
      const begin = () => {
        if (game.scene.getScene("run")) game.scene.remove("run");
        scene = new RunScene();
        game.scene.add("run", scene, true, { cfg, cb });
        if ((window as unknown as { __MW_DEBUG?: boolean }).__MW_DEBUG) (window as unknown as { __mw: unknown }).__mw = { game, scene };
      };
      if (game.isBooted) begin();
      else game.events.once(Phaser.Core.Events.READY, begin);
    },
    pause() {
      if (!scene || paused) return;
      paused = true;
      game.scene.pause("run");
      audio.stopMusic();
    },
    resume() {
      if (!scene || !paused) return;
      paused = false;
      game.scene.resume("run");
      const cfg = (scene as unknown as { cfg: LaunchConfig }).cfg;
      if (cfg) audio.playMusic(cfg.city);
    },
    isPaused: () => paused,
    action: act,
    setAudio(music, sfx) {
      audio.setEnabled(music, sfx);
    },
    destroy() {
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      parent.removeEventListener("pointerdown", onDown);
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerup", onUp);
      parent.removeEventListener("pointercancel", onUp);
      parent.removeEventListener("touchmove", block);
      parent.removeEventListener("contextmenu", block);
      scene = null;
      game.destroy(true);
    },
  };
}
