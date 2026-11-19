import { describe, expect, it } from "vitest";
import { applyRun, buyCity, claimDaily, claimMission, activeMissions, equipItem, newCtx, purchaseItem, GameRuleError } from "@/lib/progression/engine";
import { newPlayerState } from "@/lib/progression/state";
import { baseDistanceScore, validateRun, type RunResult } from "@/lib/rules";
import { levelForXp, xpForLevel } from "@/lib/data/rewards";

const NOW = new Date("2026-11-18T12:00:00Z");

function run(over: Partial<RunResult> = {}): RunResult {
  const distance = over.distance ?? 3000;
  return {
    sessionId: "s",
    city: "tokyo",
    distance,
    score: Math.floor(baseDistanceScore(distance)) + (over.coins ?? 200) * 5,
    coins: 200,
    durationMs: (distance / 20) * 1000,
    powerupsUsed: 2,
    jumps: 20,
    slides: 10,
    dodges: 80,
    laneChanges: 50,
    boostSeconds: 0,
    ...over,
  };
}

describe("score validation", () => {
  it("accepts a plausible run", () => {
    expect(validateRun(run(), (3000 / 20) * 1000 + 500)).toEqual({ ok: true });
  });
  it("rejects an inflated score", () => {
    expect(validateRun(run({ score: 10_000_000 }), null).ok).toBe(false);
  });
  it("rejects a run longer than the server-measured session", () => {
    expect(validateRun(run(), 5000).ok).toBe(false);
  });
  it("rejects impossible distance for the duration", () => {
    expect(validateRun(run({ distance: 50000, durationMs: 10000 }), null).ok).toBe(false);
  });
  it("rejects too many coins", () => {
    expect(validateRun(run({ coins: 100000, score: 999999 }), null).ok).toBe(false);
  });
});

describe("progression", () => {
  it("records a run and awards coins and xp", () => {
    const s0 = newPlayerState("u", "Tester", NOW);
    const { state, outcome } = applyRun(s0, run(), newCtx(NOW), null);
    expect(state.stats.gamesPlayed).toBe(1);
    expect(state.coins).toBeGreaterThanOrEqual(200);
    expect(state.stats.highScore).toBe(outcome.newBest ? state.stats.highScore : 0);
    expect(outcome.unlockedAchievements.map((a) => a.id)).toContain("first_run");
    expect(state.achievements.first_run).toBeDefined();
  });

  it("rejects runs in locked cities", () => {
    const s0 = newPlayerState("u", "Tester", NOW);
    expect(() => applyRun(s0, run({ city: "seoul" }), newCtx(NOW), null)).toThrow(GameRuleError);
  });

  it("unlocks New York when the score requirement is met", () => {
    const s0 = newPlayerState("u", "Tester", NOW);
    const { state } = applyRun(s0, run({ distance: 4000, durationMs: 200000 }), newCtx(NOW), null);
    expect(state.stats.highScore).toBeGreaterThanOrEqual(5000);
    expect(state.unlockedCities).toContain("newyork");
  });

  it("tracks missions from real runs and lets rewards be claimed exactly once", () => {
    let s = newPlayerState("u", "Tester", NOW);
    for (let i = 0; i < 3; i++) s = applyRun(s, run({ sessionId: `s${i}` }), newCtx(NOW), null).state;
    const gamesMission = activeMissions(s, NOW).find((m) => m.def.metric === "games" && m.def.kind === "weekly")!;
    expect(gamesMission.progress).toBe(3);
    const done = activeMissions(s, NOW).find((m) => m.completed && !m.claimed);
    expect(done).toBeDefined();
    const before = s.coins;
    s = claimMission(s, done!.key, newCtx(NOW));
    expect(s.coins).toBe(before + done!.def.reward.coins + (s.coins - before - done!.def.reward.coins));
    expect(() => claimMission(s, done!.key, newCtx(NOW))).toThrow(/already claimed/i);
  });

  it("daily rewards: once per day, streak advances, resets after a gap", () => {
    let s = newPlayerState("u", "Tester", NOW);
    s = claimDaily(s, newCtx(NOW)).state;
    expect(s.coins).toBe(100);
    expect(() => claimDaily(s, newCtx(NOW))).toThrow(/already been claimed/);
    const r2 = claimDaily(s, newCtx(new Date("2026-11-19T08:00:00Z")));
    expect(r2.reward.day).toBe(2);
    const r3 = claimDaily(r2.state, newCtx(new Date("2026-11-25T08:00:00Z")));
    expect(r3.reward.day).toBe(1);
  });

  it("day 7 grants the Neon Halo cosmetic", () => {
    let s = newPlayerState("u", "Tester", NOW);
    for (let d = 0; d < 7; d++) s = claimDaily(s, newCtx(new Date(Date.UTC(2026, 10, 18 + d, 10)))).state;
    expect(s.inventory).toContain("helm_halo");
  });

  it("shop: requires coins, prevents duplicates, equips owned items only", () => {
    let s = newPlayerState("u", "Tester", NOW);
    expect(() => purchaseItem(s, "char_cyan", newCtx(NOW))).toThrow(/Not enough/);
    s = { ...s, coins: 5000 };
    s = purchaseItem(s, "char_cyan", newCtx(NOW));
    expect(s.coins).toBe(3500);
    expect(() => purchaseItem(s, "char_cyan", newCtx(NOW))).toThrow(/Already owned/);
    expect(() => equipItem(s, "char_gold")).toThrow(/don't own/);
    s = equipItem(s, "char_cyan");
    expect(s.equipped.character).toBe("char_cyan");
  });

  it("coin-locked cities can be bought; progress-locked ones cannot", () => {
    let s = { ...newPlayerState("u", "Tester", NOW), coins: 3000 };
    s = buyCity(s, "dubai", newCtx(NOW));
    expect(s.unlockedCities).toContain("dubai");
    expect(s.coins).toBe(500);
    expect(() => buyCity(s, "paris", newCtx(NOW))).toThrow();
  });

  it("level curve is monotonic", () => {
    for (let l = 1; l < 60; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
    expect(levelForXp(xpForLevel(10))).toBe(10);
  });
});

describe("runner names", () => {
  it("generates SKEL names that are valid usernames", async () => {
    const { randomRunnerName, isValidUsername, isLegacyGeneratedName } = await import("@/lib/progression/state");
    for (let i = 0; i < 50; i++) {
      const n = randomRunnerName();
      expect(n).toMatch(/^SKEL_\d{4}$/);
      expect(isValidUsername(n)).toBe(true);
      expect(isLegacyGeneratedName(n)).toBe(false);
    }
    expect(isLegacyGeneratedName("NeonRunner482")).toBe(true);
    expect(isLegacyGeneratedName("NeonKing")).toBe(false); // custom names are kept
  });
});
