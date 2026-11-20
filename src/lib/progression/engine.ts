// Pure progression logic. Runs in the browser for offline play and on the server for online play,
// so the rules for rewards, missions, achievements and unlocks live in exactly one place.
import { ACHIEVEMENTS, type AchievementDef } from "../data/achievements";
import { CITIES, getCity, isCityId, type CityId } from "../data/cities";
import { COSMETICS, getItem, type ItemSlot } from "../data/cosmetics";
import {
  DAILY_COUNT,
  DAILY_POOL,
  MAX_METRICS,
  WEEKLY_MISSIONS,
  getMission,
  specialMissionsFor,
  type MissionDef,
  type MissionMetric,
} from "../data/missions";
import { DAILY_REWARDS, levelForXp, levelUpCoins } from "../data/rewards";
import { runXp, validateRun, type RunResult } from "../rules";
import { dayKey, daysBetween, hashString, monthKey, weekKey } from "./periods";
import { cloneState, isValidUsername, type PlayerState } from "./state";

export interface LedgerEntry {
  amount: number;
  reason: string;
  ref?: string;
}

export interface Ctx {
  now: Date;
  ledger: LedgerEntry[];
  completedMissions: MissionDef[];
  unlockedAchievements: AchievementDef[];
  unlockedCities: CityId[];
  grantedItems: string[];
  levelUps: number[];
}

export function newCtx(now = new Date()): Ctx {
  return { now, ledger: [], completedMissions: [], unlockedAchievements: [], unlockedCities: [], grantedItems: [], levelUps: [] };
}

export class GameRuleError extends Error {
  constructor(message: string, public code = 400) {
    super(message);
  }
}

// ── Coins / XP ─────────────────────────────────────────────────────────────

function grantCoins(s: PlayerState, amount: number, reason: string, ctx: Ctx, ref?: string) {
  if (amount === 0) return;
  if (s.coins + amount < 0) throw new GameRuleError("Not enough META Coins", 402);
  s.coins += amount;
  ctx.ledger.push({ amount, reason, ref });
}

function grantXp(s: PlayerState, xp: number, ctx: Ctx) {
  if (xp <= 0) return;
  const before = levelForXp(s.xp);
  s.xp += xp;
  const after = levelForXp(s.xp);
  for (let l = before + 1; l <= after; l++) {
    ctx.levelUps.push(l);
    grantCoins(s, levelUpCoins(l), "level_up", ctx, `level:${l}`);
  }
}

function grantItem(s: PlayerState, itemId: string, ctx: Ctx) {
  if (s.inventory.includes(itemId)) return false;
  s.inventory.push(itemId);
  ctx.grantedItems.push(itemId);
  return true;
}

// ── Missions ───────────────────────────────────────────────────────────────

export interface ActiveMission {
  def: MissionDef;
  periodKey: string;
  key: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  endsAt: string;
}

export function dailyMissionsFor(date: Date): MissionDef[] {
  const key = dayKey(date);
  const pool = [...DAILY_POOL];
  const picked: MissionDef[] = [];
  let h = hashString("daily:" + key);
  while (picked.length < DAILY_COUNT && pool.length) {
    const i = h % pool.length;
    picked.push(pool.splice(i, 1)[0]);
    h = hashString(String(h));
  }
  return picked;
}

function periodKeyFor(def: MissionDef, now: Date) {
  return def.kind === "daily" ? dayKey(now) : def.kind === "weekly" ? weekKey(now) : monthKey(now);
}

function periodEnd(def: MissionDef, now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (def.kind === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (def.kind === "weekly") {
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + (8 - day));
  } else return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  return d.toISOString();
}

export function activeMissionDefs(now: Date): MissionDef[] {
  return [...dailyMissionsFor(now), ...WEEKLY_MISSIONS, ...specialMissionsFor(now)];
}

export function activeMissions(s: PlayerState, now: Date): ActiveMission[] {
  return activeMissionDefs(now).map((def) => {
    const periodKey = periodKeyFor(def, now);
    const key = `${def.id}@${periodKey}`;
    const p = s.missions[key];
    return {
      def,
      periodKey,
      key,
      progress: Math.min(def.target, p?.progress ?? 0),
      completed: !!p?.completedAt,
      claimed: !!p?.claimedAt,
      endsAt: periodEnd(def, now),
    };
  });
}

function bumpMission(s: PlayerState, def: MissionDef, value: number, ctx: Ctx) {
  if (value <= 0) return;
  const key = `${def.id}@${periodKeyFor(def, ctx.now)}`;
  const cur = s.missions[key] ?? { progress: 0 };
  if (cur.completedAt) return;
  cur.progress = MAX_METRICS.includes(def.metric) ? Math.max(cur.progress, value) : cur.progress + value;
  if (cur.progress >= def.target) {
    cur.progress = def.target;
    cur.completedAt = ctx.now.toISOString();
    s.stats.missionsCompleted += 1;
    ctx.completedMissions.push(def);
    if (def.kind === "daily") bumpEvent(s, "daily_completed", 1, ctx);
  }
  s.missions[key] = cur;
}

function bumpEvent(s: PlayerState, metric: MissionMetric, value: number, ctx: Ctx) {
  for (const def of activeMissionDefs(ctx.now)) if (def.metric === metric) bumpMission(s, def, value, ctx);
}

function runMetricValue(metric: MissionMetric, r: RunResult): number {
  switch (metric) {
    case "coins":
      return r.coins;
    case "games":
      return 1;
    case "distance":
      return Math.floor(r.distance);
    case "powerups":
      return r.powerupsUsed;
    case "score_total":
    case "score_best":
      return r.score;
    case "survive_seconds":
      return Math.floor(r.durationMs / 1000);
    case "jumps":
      return r.jumps;
    case "slides":
      return r.slides;
    case "dodges":
      return r.dodges;
    default:
      return 0;
  }
}

export function claimMission(state: PlayerState, missionKey: string, ctx: Ctx): PlayerState {
  const s = cloneState(state);
  const [id, period] = missionKey.split("@");
  const def = getMission(id);
  const active = activeMissions(s, ctx.now).find((m) => m.key === missionKey);
  if (!def || !active) throw new GameRuleError("This mission is not active");
  const p = s.missions[missionKey];
  if (!p?.completedAt) throw new GameRuleError("Mission not completed yet");
  if (p.claimedAt) throw new GameRuleError("Reward already claimed", 409);
  p.claimedAt = ctx.now.toISOString();
  grantCoins(s, def.reward.coins, "mission", ctx, `${id}@${period}`);
  grantXp(s, def.reward.xp, ctx);
  settle(s, ctx);
  return s;
}

// ── Cities ─────────────────────────────────────────────────────────────────

export function cityUnlockMet(s: PlayerState, cityId: CityId): boolean {
  const rule = getCity(cityId).unlock;
  switch (rule.type) {
    case "free":
      return true;
    case "score":
      return s.stats.highScore >= rule.value;
    case "level":
      return levelForXp(s.xp) >= rule.value;
    case "missions":
      return s.stats.missionsCompleted >= rule.value;
    case "coins":
      return false; // must be bought
  }
}

export function cityUnlockProgress(s: PlayerState, cityId: CityId): { current: number; target: number } {
  const rule = getCity(cityId).unlock;
  switch (rule.type) {
    case "free":
      return { current: 1, target: 1 };
    case "score":
      return { current: s.stats.highScore, target: rule.value };
    case "level":
      return { current: levelForXp(s.xp), target: rule.value };
    case "missions":
      return { current: s.stats.missionsCompleted, target: rule.value };
    case "coins":
      return { current: s.coins, target: rule.value };
  }
}

function unlockCityInternal(s: PlayerState, cityId: CityId, ctx: Ctx) {
  if (s.unlockedCities.includes(cityId)) return;
  s.unlockedCities.push(cityId);
  ctx.unlockedCities.push(cityId);
  bumpEvent(s, "cities_unlocked", 1, ctx);
}

export function buyCity(state: PlayerState, cityId: string, ctx: Ctx): PlayerState {
  if (!isCityId(cityId)) throw new GameRuleError("Unknown city");
  const s = cloneState(state);
  if (s.unlockedCities.includes(cityId)) throw new GameRuleError("City already unlocked", 409);
  const rule = getCity(cityId).unlock;
  if (rule.type !== "coins") throw new GameRuleError("This city is unlocked through progress, not coins");
  grantCoins(s, -rule.value, "city_unlock", ctx, cityId);
  unlockCityInternal(s, cityId, ctx);
  settle(s, ctx);
  return s;
}

// ── Achievements ───────────────────────────────────────────────────────────

export function achievementProgress(s: PlayerState, a: AchievementDef): number {
  const m = a.metric;
  switch (m.kind) {
    case "stat":
      return s.stats[m.stat];
    case "level":
      return levelForXp(s.xp);
    case "citiesUnlocked":
      return s.unlockedCities.length;
    case "citiesPlayed":
      return Object.values(s.stats.cityStats).filter((c) => c && (c.games > 0 || c.distance > 0)).length;
    case "cityDistance":
      return Math.floor(s.stats.cityStats[m.city]?.distance ?? 0);
    case "cityBest":
      return s.stats.cityStats[m.city]?.best ?? 0;
  }
}

/** Apply every automatic unlock until the state stops changing (XP can cascade into levels, etc.). */
function settle(s: PlayerState, ctx: Ctx) {
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const c of CITIES) {
      if (!s.unlockedCities.includes(c.id) && cityUnlockMet(s, c.id)) {
        unlockCityInternal(s, c.id, ctx);
        changed = true;
      }
    }
    for (const a of ACHIEVEMENTS) {
      if (s.achievements[a.id]) continue;
      if (achievementProgress(s, a) >= a.target) {
        s.achievements[a.id] = { unlockedAt: ctx.now.toISOString() };
        ctx.unlockedAchievements.push(a);
        grantCoins(s, a.reward.coins, "achievement", ctx, a.id);
        grantXp(s, a.reward.xp, ctx);
        changed = true;
      }
    }
    const level = levelForXp(s.xp);
    for (const item of COSMETICS) {
      if (item.unlockLevel && level >= item.unlockLevel && grantItem(s, item.id, ctx)) changed = true;
    }
    if (!changed) break;
  }
}

// ── Runs ───────────────────────────────────────────────────────────────────

export interface RunOutcome {
  xpEarned: number;
  coinsEarned: number;
  newBest: boolean;
  previousBest: number;
  levelBefore: number;
  levelAfter: number;
  completedMissions: { id: string; title: string; reward: { coins: number; xp: number } }[];
  unlockedAchievements: { id: string; title: string }[];
  unlockedCities: CityId[];
  grantedItems: string[];
  rank?: number | null;
}

export function applyRun(state: PlayerState, r: RunResult, ctx: Ctx, serverElapsedMs: number | null): { state: PlayerState; outcome: RunOutcome } {
  const v = validateRun(r, serverElapsedMs);
  if (!v.ok) throw new GameRuleError(`Run rejected: ${v.reason}`, 422);
  if (!state.unlockedCities.includes(r.city)) throw new GameRuleError("City is locked", 403);
  const s = cloneState(state);
  const levelBefore = levelForXp(s.xp);
  const previousBest = s.stats.highScore;
  const score = Math.floor(r.score);
  const distance = Math.floor(r.distance);

  const st = s.stats;
  st.gamesPlayed += 1;
  st.totalDistance += distance;
  st.totalCoins += r.coins;
  st.totalScore += score;
  st.highScore = Math.max(st.highScore, score);
  st.powerupsUsed += r.powerupsUsed;
  st.jumps += r.jumps;
  st.slides += r.slides;
  st.dodges += r.dodges;
  st.longestRunMs = Math.max(st.longestRunMs, r.durationMs);
  // Starting city gets the game, coins and best score; distance is credited to every city on the route.
  const cs = st.cityStats[r.city] ?? { games: 0, distance: 0, coins: 0, best: 0 };
  cs.games += 1;
  cs.coins += r.coins;
  cs.best = Math.max(cs.best, score);
  st.cityStats[r.city] = cs;
  const route = r.route?.length ? r.route : [{ city: r.city, distance }];
  for (const leg of route) {
    const c = st.cityStats[leg.city] ?? { games: 0, distance: 0, coins: 0, best: 0 };
    c.distance += Math.floor(leg.distance);
    st.cityStats[leg.city] = c;
  }

  grantCoins(s, r.coins, "run", ctx, r.sessionId);
  const xp = runXp(r);
  grantXp(s, xp, ctx);

  const normalized: RunResult = { ...r, score, distance };
  for (const def of activeMissionDefs(ctx.now)) {
    if (def.city && def.city !== r.city) continue;
    bumpMission(s, def, runMetricValue(def.metric, normalized), ctx);
  }
  settle(s, ctx);

  return {
    state: s,
    outcome: {
      xpEarned: xp,
      coinsEarned: r.coins,
      newBest: score > previousBest,
      previousBest,
      levelBefore,
      levelAfter: levelForXp(s.xp),
      completedMissions: ctx.completedMissions.map((m) => ({ id: m.id, title: m.title, reward: m.reward })),
      unlockedAchievements: ctx.unlockedAchievements.map((a) => ({ id: a.id, title: a.title })),
      unlockedCities: ctx.unlockedCities,
      grantedItems: ctx.grantedItems,
    },
  };
}

// ── Daily rewards ──────────────────────────────────────────────────────────

export function dailyStatus(s: PlayerState, now: Date) {
  const today = dayKey(now);
  const last = s.daily.lastClaimedOn;
  const claimedToday = last === today;
  let nextDay: number;
  if (!last) nextDay = 1;
  else {
    const gap = daysBetween(last, today);
    if (gap === 0) nextDay = (s.daily.streak % 7) + 1; // shown as tomorrow's reward
    else if (gap === 1) nextDay = (s.daily.streak % 7) + 1;
    else nextDay = 1; // streak broken
  }
  const currentDay = claimedToday ? ((s.daily.streak - 1) % 7) + 1 : nextDay;
  return { today, claimedToday, nextDay, currentDay, streak: s.daily.streak };
}

export function claimDaily(state: PlayerState, ctx: Ctx): { state: PlayerState; reward: { day: number; coins: number; itemId?: string } } {
  const s = cloneState(state);
  const status = dailyStatus(s, ctx.now);
  if (status.claimedToday) throw new GameRuleError("Today's reward has already been claimed", 409);
  const day = status.nextDay;
  const def = DAILY_REWARDS[day - 1];
  let coins = def.coins;
  let itemId: string | undefined;
  if (def.itemId) {
    if (grantItem(s, def.itemId, ctx)) itemId = def.itemId;
    else coins = def.fallbackCoins ?? 0;
  }
  grantCoins(s, coins, "daily_reward", ctx, `${status.today}:day${day}`);
  s.daily = { streak: day === 1 ? 1 : s.daily.streak + 1, lastClaimedOn: status.today, totalClaims: s.daily.totalClaims + 1 };
  settle(s, ctx);
  return { state: s, reward: { day, coins, itemId } };
}

// ── Shop ───────────────────────────────────────────────────────────────────

export function purchaseItem(state: PlayerState, itemId: string, ctx: Ctx): PlayerState {
  const item = getItem(itemId);
  if (!item) throw new GameRuleError("Unknown item");
  const s = cloneState(state);
  if (s.inventory.includes(itemId)) throw new GameRuleError("Already owned", 409);
  if (item.rewardOnly || item.unlockLevel || item.price <= 0) throw new GameRuleError("This item can't be bought with coins");
  grantCoins(s, -item.price, "purchase", ctx, itemId);
  grantItem(s, itemId, ctx);
  settle(s, ctx);
  return s;
}

export function equipItem(state: PlayerState, itemId: string): PlayerState {
  const item = getItem(itemId);
  if (!item) throw new GameRuleError("Unknown item");
  if (!state.inventory.includes(itemId)) throw new GameRuleError("You don't own this item", 403);
  const s = cloneState(state);
  s.equipped[item.slot] = itemId;
  return s;
}

export function unequipSlot(state: PlayerState, slot: ItemSlot): PlayerState {
  if (slot === "character") throw new GameRuleError("A character must always be equipped");
  const s = cloneState(state);
  const defaults: Record<ItemSlot, string> = { character: "char_masked", helmet: "helm_standard", trail: "trail_none", jumpfx: "jfx_none", slidefx: "sfx_none", emote: "emote_none" };
  s.equipped[slot] = defaults[slot];
  return s;
}

export function renamePlayer(state: PlayerState, username: string): PlayerState {
  if (!isValidUsername(username)) throw new GameRuleError("Username must be 3–16 letters, numbers or underscores");
  const s = cloneState(state);
  s.username = username;
  return s;
}
