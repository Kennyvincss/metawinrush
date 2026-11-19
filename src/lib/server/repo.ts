import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CityId } from "../data/cities";
import { DEFAULT_EQUIPPED, type ItemSlot } from "../data/cosmetics";
import { levelForXp } from "../data/rewards";
import { GameRuleError, newCtx, type Ctx } from "../progression/engine";
import { dayKey, monthKey, weekKey } from "../progression/periods";
import { emptyStats, isLegacyGeneratedName, randomRunnerName, type PlayerState } from "../progression/state";
import { currentTournaments } from "../tournaments";
import { admin } from "./supabase";

export interface Loaded {
  state: PlayerState;
  version: number;
}

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${what}: missing row`);
  return res.data;
}

async function bootstrap(db: SupabaseClient, userId: string, preferred?: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = attempt === 0 && preferred && /^[A-Za-z0-9_]{3,16}$/.test(preferred) ? preferred : randomRunnerName();
    const { error } = await db.rpc("bootstrap_player", {
      p_user: userId,
      p_username: username,
      p_equipped: DEFAULT_EQUIPPED,
      p_settings: { music: true, sfx: true, tutorialDone: false },
    });
    if (!error) return;
    if (!/duplicate key|unique/i.test(error.message)) throw new Error(`bootstrap: ${error.message}`);
  }
  throw new Error("bootstrap: could not allocate a username");
}

export async function loadPlayer(userId: string, now = new Date(), preferredName?: string): Promise<Loaded> {
  const db = admin();
  const first = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (first.error) throw new Error(`profile: ${first.error.message}`);
  let profile = first.data;
  if (!profile) {
    await bootstrap(db, userId, preferredName);
    profile = check(await db.from("profiles").select("*").eq("id", userId).single(), "profile");
  }
  // Auto-generated names from older versions become SKEL names (custom names are left alone).
  if (isLegacyGeneratedName(profile.username)) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const username = randomRunnerName();
      const { error } = await db.from("profiles").update({ username }).eq("id", userId);
      if (!error) {
        profile = { ...profile, username };
        break;
      }
    }
  }
  const periods = [dayKey(now), weekKey(now), monthKey(now)];
  const [stats, bal, cities, inv, ach, mis, lastDaily, dailyCount] = await Promise.all([
    db.from("player_stats").select("*").eq("user_id", userId).single(),
    db.from("coin_balances").select("balance, version").eq("user_id", userId).single(),
    db.from("unlocked_cities").select("city_id").eq("user_id", userId),
    db.from("player_inventory").select("item_id").eq("user_id", userId),
    db.from("player_achievements").select("achievement_id, unlocked_at").eq("user_id", userId),
    db.from("player_missions").select("*").eq("user_id", userId).in("period_key", periods),
    db.from("daily_rewards").select("claimed_on, day_index").eq("user_id", userId).order("claimed_on", { ascending: false }).limit(1).maybeSingle(),
    db.from("daily_rewards").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const st = check(stats, "stats");
  const b = check(bal, "balance");
  const state: PlayerState = {
    userId,
    username: profile.username,
    createdAt: profile.created_at,
    xp: Number(st.xp),
    coins: Number(b.balance),
    stats: {
      ...emptyStats(),
      gamesPlayed: st.games_played,
      totalDistance: Number(st.total_distance),
      totalCoins: Number(st.total_coins),
      totalScore: Number(st.total_score),
      highScore: Number(st.high_score),
      powerupsUsed: st.powerups_used,
      jumps: st.jumps,
      slides: st.slides,
      dodges: st.dodges,
      longestRunMs: Number(st.longest_run_ms),
      missionsCompleted: st.missions_completed,
      cityStats: st.city_stats ?? {},
    },
    unlockedCities: check(cities, "cities").map((r: { city_id: CityId }) => r.city_id),
    inventory: check(inv, "inventory").map((r: { item_id: string }) => r.item_id),
    equipped: { ...DEFAULT_EQUIPPED, ...(profile.equipped as Partial<Record<ItemSlot, string>>) },
    missions: Object.fromEntries(
      check(mis, "missions").map((m: { mission_id: string; period_key: string; progress: number; completed_at: string | null; claimed_at: string | null }) => [
        `${m.mission_id}@${m.period_key}`,
        { progress: m.progress, completedAt: m.completed_at ?? undefined, claimedAt: m.claimed_at ?? undefined },
      ]),
    ),
    achievements: Object.fromEntries(check(ach, "achievements").map((a: { achievement_id: string; unlocked_at: string }) => [a.achievement_id, { unlockedAt: a.unlocked_at }])),
    daily: {
      streak: lastDaily.data?.day_index ?? 0,
      lastClaimedOn: lastDaily.data?.claimed_on ?? null,
      totalClaims: dailyCount.count ?? 0,
    },
    settings: { music: true, sfx: true, tutorialDone: false, ...(profile.settings ?? {}) },
  };
  return { state, version: b.version };
}

export interface Extras {
  daily_claim?: { claimed_on: string; day_index: number; coins: number; item_id?: string | null };
  session?: { id: string; status: "finished" | "rejected"; reject_reason?: string };
  score?: { session_id: string; city_id: string; score: number; distance: number; coins: number; duration_ms: number };
  tournaments?: { tournament_id: string; score: number }[];
}

export function buildPayload(prev: PlayerState, next: PlayerState, ctx: Ctx, version: number, extras: Extras = {}) {
  const s = next.stats;
  const missions = Object.entries(next.missions)
    .filter(([k, v]) => JSON.stringify(prev.missions[k]) !== JSON.stringify(v))
    .map(([k, v]) => {
      const [mission_id, period_key] = k.split("@");
      return { mission_id, period_key, progress: v.progress, completed_at: v.completedAt ?? null, claimed_at: v.claimedAt ?? null };
    });
  const profileChanged =
    prev.username !== next.username || JSON.stringify(prev.equipped) !== JSON.stringify(next.equipped) || JSON.stringify(prev.settings) !== JSON.stringify(next.settings);
  return {
    coins: { balance: next.coins, expected_version: version },
    profile: profileChanged ? { username: next.username, equipped: next.equipped, settings: next.settings } : null,
    stats: {
      xp: next.xp,
      level: levelForXp(next.xp),
      games_played: s.gamesPlayed,
      total_distance: s.totalDistance,
      total_coins: s.totalCoins,
      total_score: s.totalScore,
      high_score: s.highScore,
      powerups_used: s.powerupsUsed,
      jumps: s.jumps,
      slides: s.slides,
      dodges: s.dodges,
      longest_run_ms: s.longestRunMs,
      missions_completed: s.missionsCompleted,
      city_stats: s.cityStats,
    },
    ledger: ctx.ledger,
    missions,
    achievements: Object.keys(next.achievements)
      .filter((k) => !prev.achievements[k])
      .map((k) => ({ achievement_id: k, unlocked_at: next.achievements[k].unlockedAt })),
    cities: next.unlockedCities.filter((c) => !prev.unlockedCities.includes(c)),
    inventory: next.inventory.filter((i) => !prev.inventory.includes(i)),
    daily_claim: extras.daily_claim ?? null,
    session: extras.session ?? null,
    score: extras.score ?? null,
    tournaments: extras.tournaments ?? [],
  };
}

/**
 * Load → apply a pure rules function → write atomically. Retries on optimistic-lock conflicts.
 */
export async function mutate<T>(
  userId: string,
  fn: (state: PlayerState, ctx: Ctx) => { state: PlayerState; result: T; extras?: Extras } | Promise<{ state: PlayerState; result: T; extras?: Extras }>,
): Promise<{ state: PlayerState; result: T }> {
  const db = admin();
  for (let attempt = 0; attempt < 3; attempt++) {
    const now = new Date();
    const { state, version } = await loadPlayer(userId, now);
    const ctx = newCtx(now);
    const out = await fn(state, ctx);
    const payload = buildPayload(state, out.state, ctx, version, out.extras);
    const { error } = await db.rpc("apply_player_update", { p_user: userId, p: payload });
    if (!error) return { state: out.state, result: out.result };
    if (/version_conflict/.test(error.message)) continue;
    if (/session_not_active/.test(error.message)) throw new GameRuleError("This run was already submitted", 409);
    if (/daily_rewards_user_id_claimed_on_key|duplicate key/.test(error.message)) throw new GameRuleError("Already claimed", 409);
    throw new Error(`apply_player_update: ${error.message}`);
  }
  throw new GameRuleError("The server is busy — please try again", 409);
}

export async function ensureTournaments(now = new Date()) {
  const db = admin();
  const defs = currentTournaments(now);
  const { error } = await db.from("tournaments").upsert(
    defs.map((d) => ({ id: d.id, name: d.name, kind: d.kind, city_id: d.city, starts_at: d.startsAt, ends_at: d.endsAt })),
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw new Error(`tournaments: ${error.message}`);
  return defs;
}
