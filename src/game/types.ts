import type { CityId } from "@/lib/data/cities";
import type { CharacterLook } from "@/lib/data/cosmetics";
import type { PowerUpKind, RunResult } from "@/lib/rules";

export type GameAction = "left" | "right" | "jump" | "slide";

export interface LaunchConfig {
  city: CityId;
  sessionId: string;
  seed: number;
  look: CharacterLook;
  characterId: string;
  helmet: string;
  trail: string;
  jumpfx: string;
  slidefx: string;
  emote: string;
  tutorial: boolean;
  music: boolean;
  sfx: boolean;
}

export interface HudState {
  score: number;
  coins: number;
  distance: number;
  multiplier: number;
  speed: number;
  powerups: { kind: PowerUpKind; remaining: number; total: number }[];
  shield: boolean;
  elapsedMs: number;
  powerupsUsed: number;
  jumps: number;
  slides: number;
  dodges: number;
}

export type TutorialStep = { action: GameAction; text: string; index: number; total: number } | { done: true } | null;

export interface GameCallbacks {
  onHud(h: HudState): void;
  onEnd(r: RunResult): void;
  onTutorial(step: TutorialStep): void;
  onPauseRequest(): void;
  onReady(): void;
  onEvent?(e: { type: "powerup"; kind: PowerUpKind } | { type: "stumble" } | { type: "shieldBreak" } | { type: "newBest" }): void;
}
