import type { CityId } from "../data/cities";
import { DEFAULT_EQUIPPED, DEFAULT_INVENTORY, type ItemSlot } from "../data/cosmetics";

export interface CityStats {
  games: number;
  distance: number;
  coins: number;
  best: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  totalDistance: number;
  totalCoins: number;
  totalScore: number;
  highScore: number;
  powerupsUsed: number;
  jumps: number;
  slides: number;
  dodges: number;
  longestRunMs: number;
  missionsCompleted: number;
  cityStats: Partial<Record<CityId, CityStats>>;
}

export interface MissionProgress {
  progress: number;
  completedAt?: string;
  claimedAt?: string;
}

export interface PlayerSettings {
  music: boolean;
  sfx: boolean;
  tutorialDone: boolean;
}

export interface PlayerState {
  userId: string;
  username: string;
  createdAt: string;
  xp: number;
  coins: number;
  stats: PlayerStats;
  unlockedCities: CityId[];
  inventory: string[];
  equipped: Record<ItemSlot, string>;
  /** key: `${missionId}@${periodKey}` */
  missions: Record<string, MissionProgress>;
  achievements: Record<string, { unlockedAt: string }>;
  daily: { streak: number; lastClaimedOn: string | null; totalClaims: number };
  settings: PlayerSettings;
}

export function emptyStats(): PlayerStats {
  return {
    gamesPlayed: 0,
    totalDistance: 0,
    totalCoins: 0,
    totalScore: 0,
    highScore: 0,
    powerupsUsed: 0,
    jumps: 0,
    slides: 0,
    dodges: 0,
    longestRunMs: 0,
    missionsCompleted: 0,
    cityStats: {},
  };
}

export function newPlayerState(userId: string, username: string, now = new Date()): PlayerState {
  return {
    userId,
    username,
    createdAt: now.toISOString(),
    xp: 0,
    coins: 0,
    stats: emptyStats(),
    unlockedCities: ["tokyo"],
    inventory: [...DEFAULT_INVENTORY],
    equipped: { ...DEFAULT_EQUIPPED },
    missions: {},
    achievements: {},
    daily: { streak: 0, lastClaimedOn: null, totalClaims: 0 },
    settings: { music: true, sfx: true, tutorialDone: false },
  };
}

export function cloneState(s: PlayerState): PlayerState {
  return JSON.parse(JSON.stringify(s));
}

const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
export function isValidUsername(name: string): boolean {
  return USERNAME_RE.test(name);
}

export function randomRunnerName(): string {
  const a = ["Neon", "Cyber", "Volt", "Shadow", "Turbo", "Nova", "Pixel", "Chrome", "Hyper", "Glitch"];
  const b = ["Runner", "Rush", "Dash", "Ghost", "Blade", "Comet", "Fox", "Raven", "Pulse", "Wolf"];
  return `${a[Math.floor(Math.random() * a.length)]}${b[Math.floor(Math.random() * b.length)]}${Math.floor(Math.random() * 900 + 100)}`;
}
