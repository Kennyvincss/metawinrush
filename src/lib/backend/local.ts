// Offline mode: progress lives in this browser and the same rules engine the server uses runs locally.
// Leaderboards and the Arena show only this device's real runs (never invented players).
import type { CityId } from "../data/cities";
import type { ItemSlot } from "../data/cosmetics";
import { levelForXp } from "../data/rewards";
import { applyRun, buyCity, claimDaily, claimMission, equipItem, newCtx, purchaseItem, renamePlayer, unequipSlot } from "../progression/engine";
import { periodStart, type LeaderboardPeriod } from "../progression/periods";
import { newPlayerState, randomRunnerName, type PlayerSettings, type PlayerState } from "../progression/state";
import type { RunResult } from "../rules";
import { currentTournaments } from "../tournaments";
import type { Backend, Leaderboard, LeaderboardEntry, TournamentDetail, TournamentView } from "./types";

const KEY = "mwrush:player:v1";
const RUNS = "mwrush:runs:v1";
const SESSIONS = "mwrush:sessions:v1";

interface StoredRun {
  score: number;
  city: CityId;
  at: string;
  distance: number;
  coins: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage full or blocked: progress for this session stays in memory */
  }
}

export class LocalBackend implements Backend {
  mode = "local" as const;
  private state!: PlayerState;

  private save(s: PlayerState) {
    this.state = s;
    write(KEY, s);
    return s;
  }

  async load() {
    const s = read<PlayerState | null>(KEY, null);
    this.state = s ?? newPlayerState(`local-${Math.random().toString(36).slice(2, 10)}`, randomRunnerName());
    // Merge in fields added in later versions.
    const fresh = newPlayerState(this.state.userId, this.state.username);
    this.state = { ...fresh, ...this.state, settings: { ...fresh.settings, ...this.state.settings }, equipped: { ...fresh.equipped, ...this.state.equipped } };
    return this.save(this.state);
  }

  async startRun(city: CityId) {
    if (!this.state.unlockedCities.includes(city)) throw new Error("City is locked");
    const sessionId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const sessions = read<Record<string, number>>(SESSIONS, {});
    sessions[sessionId] = Date.now();
    // keep the map small
    for (const k of Object.keys(sessions)) if (Date.now() - sessions[k] > 6 * 3600 * 1000) delete sessions[k];
    write(SESSIONS, sessions);
    return { sessionId, seed: Math.floor(Math.random() * 2 ** 31) };
  }

  async finishRun(r: RunResult) {
    const sessions = read<Record<string, number>>(SESSIONS, {});
    const started = sessions[r.sessionId];
    if (!started) throw new Error("This run was already submitted");
    delete sessions[r.sessionId];
    write(SESSIONS, sessions);
    const ctx = newCtx();
    const { state, outcome } = applyRun(this.state, r, ctx, Date.now() - started);
    this.save(state);
    const runs = read<StoredRun[]>(RUNS, []);
    runs.push({ score: Math.floor(r.score), city: r.city, at: new Date().toISOString(), distance: Math.floor(r.distance), coins: r.coins });
    runs.sort((a, b) => b.score - a.score);
    write(RUNS, runs.slice(0, 200));
    const rank = 1 + runs.filter((x) => x.score > Math.floor(r.score)).length;
    return { state, outcome: { ...outcome, rank } };
  }

  async claimMission(key: string) {
    return this.save(claimMission(this.state, key, newCtx()));
  }
  async claimDaily() {
    const out = claimDaily(this.state, newCtx());
    this.save(out.state);
    return out;
  }
  async purchase(itemId: string) {
    return this.save(purchaseItem(this.state, itemId, newCtx()));
  }
  async equip(itemId: string) {
    return this.save(equipItem(this.state, itemId));
  }
  async unequip(slot: ItemSlot) {
    return this.save(unequipSlot(this.state, slot));
  }
  async buyCity(cityId: CityId) {
    return this.save(buyCity(this.state, cityId, newCtx()));
  }
  async rename(username: string) {
    return this.save(renamePlayer(this.state, username));
  }
  async updateSettings(s: Partial<PlayerSettings>) {
    return this.save({ ...this.state, settings: { ...this.state.settings, ...s } });
  }

  private runsSince(since: Date | null, city?: CityId | null, until?: Date) {
    return read<StoredRun[]>(RUNS, []).filter((r) => (!since || new Date(r.at) >= since) && (!until || new Date(r.at) < until) && (!city || r.city === city));
  }

  private toEntries(runs: StoredRun[]): LeaderboardEntry[] {
    const lvl = levelForXp(this.state.xp);
    return runs
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((r, i) => ({ rank: i + 1, userId: this.state.userId, username: this.state.username, characterId: this.state.equipped.character, level: lvl, score: r.score, city: r.city, at: r.at }));
  }

  async leaderboard(period: LeaderboardPeriod, city?: CityId | null): Promise<Leaderboard> {
    const runs = this.runsSince(periodStart(period, new Date()), city);
    const entries = this.toEntries(runs);
    return { scope: "device", entries, me: entries.length ? { rank: 1, score: entries[0].score, total: 1 } : null };
  }

  private view(t: ReturnType<typeof currentTournaments>[number]): TournamentView {
    const runs = this.runsSince(new Date(t.startsAt), t.city, new Date(t.endsAt));
    const best = runs.length ? Math.max(...runs.map((r) => r.score)) : null;
    return { ...t, participants: best === null ? 0 : 1, topScore: best, myScore: best, myRank: best === null ? null : 1 };
  }

  async tournaments() {
    return currentTournaments(new Date()).map((t) => this.view(t));
  }

  async tournament(id: string): Promise<TournamentDetail> {
    const t = currentTournaments(new Date()).find((x) => x.id === id);
    if (!t) throw new Error("Tournament not found");
    const runs = this.runsSince(new Date(t.startsAt), t.city, new Date(t.endsAt));
    return { ...this.view(t), entries: this.toEntries(runs) };
  }
}
