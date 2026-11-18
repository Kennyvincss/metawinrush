import type { CityId } from "../data/cities";
import type { ItemSlot } from "../data/cosmetics";
import type { RunOutcome } from "../progression/engine";
import type { LeaderboardPeriod } from "../progression/periods";
import type { PlayerSettings, PlayerState } from "../progression/state";
import type { RunResult } from "../rules";
import type { TournamentDef } from "../tournaments";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  characterId: string;
  level: number;
  score: number;
  city?: CityId;
  at?: string;
}

export interface Leaderboard {
  scope: "global" | "device";
  entries: LeaderboardEntry[];
  me: { rank: number; score: number; total: number } | null;
}

export interface TournamentView extends TournamentDef {
  participants: number;
  topScore: number | null;
  myScore: number | null;
  myRank: number | null;
}

export interface TournamentDetail extends TournamentView {
  entries: LeaderboardEntry[];
}

export interface RunStart {
  sessionId: string;
  seed: number;
}

export interface Backend {
  mode: "local" | "online";
  load(): Promise<PlayerState>;
  startRun(city: CityId): Promise<RunStart>;
  finishRun(r: RunResult): Promise<{ state: PlayerState; outcome: RunOutcome }>;
  claimMission(key: string): Promise<PlayerState>;
  claimDaily(): Promise<{ state: PlayerState; reward: { day: number; coins: number; itemId?: string } }>;
  purchase(itemId: string): Promise<PlayerState>;
  equip(itemId: string): Promise<PlayerState>;
  unequip(slot: ItemSlot): Promise<PlayerState>;
  buyCity(cityId: CityId): Promise<PlayerState>;
  rename(username: string): Promise<PlayerState>;
  updateSettings(s: Partial<PlayerSettings>): Promise<PlayerState>;
  leaderboard(period: LeaderboardPeriod, city?: CityId | null): Promise<Leaderboard>;
  tournaments(): Promise<TournamentView[]>;
  tournament(id: string): Promise<TournamentDetail>;
}
