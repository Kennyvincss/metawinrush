// Gameplay rules shared by the game engine (to compute score) and the server (to validate it).
import { isCityId, type CityId } from "./data/cities";

export const ABSOLUTE_MAX_SPEED = 46; // m/s, higher than any city's cap
export const COIN_SCORE = 5; // points per coin picked up
export const SCORE_BOOST_MULT = 2;
export const POWERUP_DURATION: Record<PowerUpKind, number> = {
  magnet: 10,
  shield: 20,
  scoreboost: 10,
  coinboost: 10,
  superjump: 10,
};
export const COIN_SPACING = 3.2; // meters between consecutive coins in a trail

export type PowerUpKind = "magnet" | "shield" | "scoreboost" | "coinboost" | "superjump";
export const POWERUP_KINDS: PowerUpKind[] = ["magnet", "shield", "scoreboost", "coinboost", "superjump"];

/** Distance multiplier: grows by 0.5 every 1,000 m, capped at 8x. */
export function distanceMultiplier(distance: number): number {
  return Math.min(8, 1 + Math.floor(distance / 1000) * 0.5);
}

/** Exact integral of distanceMultiplier from 0..d — the score from distance alone with no boosts. */
export function baseDistanceScore(d: number): number {
  let total = 0;
  let pos = 0;
  while (pos < d) {
    const next = Math.min(d, (Math.floor(pos / 1000) + 1) * 1000);
    total += (next - pos) * distanceMultiplier(pos);
    pos = next;
  }
  return total;
}

export interface RunResult {
  sessionId: string;
  city: CityId;
  score: number;
  distance: number; // meters
  coins: number;
  durationMs: number;
  powerupsUsed: number;
  jumps: number;
  slides: number;
  dodges: number; // obstacles passed
  laneChanges: number;
  boostSeconds: number; // seconds spent with score boost active
  tutorial?: boolean;
  /** City-to-city tour: meters run in each city, in order. `city` is the starting city. */
  route?: { city: CityId; distance: number }[];
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

const int = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;

/**
 * Plausibility checks for a submitted run. `serverElapsedMs` is the wall time the server
 * measured between issuing the session and receiving the result (null in offline mode).
 */
export function validateRun(r: RunResult, serverElapsedMs: number | null): ValidationResult {
  if (!r || typeof r !== "object") return { ok: false, reason: "malformed" };
  if (!isCityId(r.city)) return { ok: false, reason: "unknown city" };
  for (const k of ["score", "distance", "coins", "durationMs", "powerupsUsed", "jumps", "slides", "dodges", "laneChanges", "boostSeconds"] as const) {
    if (!int(r[k])) return { ok: false, reason: `invalid ${k}` };
  }
  const secs = r.durationMs / 1000;
  if (secs > 4 * 3600) return { ok: false, reason: "run too long" };
  if (serverElapsedMs !== null && r.durationMs > serverElapsedMs + 3000) {
    return { ok: false, reason: "duration exceeds server-measured session time" };
  }
  if (r.distance > ABSOLUTE_MAX_SPEED * secs + 5) return { ok: false, reason: "distance impossible for duration" };
  if (r.boostSeconds > secs + 1) return { ok: false, reason: "boost longer than run" };
  // Coins: at most one coin per COIN_SPACING meters in each of 3 lanes, doubled by coin boost.
  const maxCoins = Math.ceil((r.distance / COIN_SPACING) * 3 * 2) + 20;
  if (r.coins > maxCoins) return { ok: false, reason: "too many coins for distance" };
  // Score: distance score, doubled for at most the boosted distance, plus coin points.
  const boostedMeters = Math.min(r.distance, r.boostSeconds * ABSOLUTE_MAX_SPEED);
  const maxScore =
    baseDistanceScore(r.distance) + boostedMeters * distanceMultiplier(r.distance) * (SCORE_BOOST_MULT - 1) + r.coins * COIN_SCORE;
  if (r.score > Math.ceil(maxScore * 1.02) + 50) return { ok: false, reason: "score exceeds maximum for distance" };
  if (r.powerupsUsed > Math.ceil(r.distance / 150) + 2) return { ok: false, reason: "too many power-ups" };
  if (r.jumps + r.slides > secs * 6 + 10) return { ok: false, reason: "too many actions" };
  if (r.dodges > r.distance / 8 + 10) return { ok: false, reason: "too many dodges" };
  if (r.route !== undefined) {
    if (!Array.isArray(r.route) || r.route.length === 0 || r.route.length > 64) return { ok: false, reason: "invalid route" };
    if (r.route[0].city !== r.city) return { ok: false, reason: "route must start in the run's city" };
    let sum = 0;
    for (const leg of r.route) {
      if (!leg || !isCityId(leg.city) || !int(leg.distance)) return { ok: false, reason: "invalid route leg" };
      sum += leg.distance;
    }
    if (sum > r.distance + 10) return { ok: false, reason: "route longer than run" };
  }
  return { ok: true };
}

/** XP earned from a run (before missions/achievements). */
export function runXp(r: Pick<RunResult, "distance" | "coins">): number {
  return 20 + Math.floor(r.distance / 12) + Math.floor(r.coins / 2);
}
