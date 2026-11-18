import { CITIES, type CityId } from "./cities";

// Metrics a mission can track. "sum" metrics add every run's value, "max" metrics keep the best single run.
export type RunMetric =
  | "coins"
  | "games"
  | "distance"
  | "powerups"
  | "score_total"
  | "score_best"
  | "survive_seconds"
  | "jumps"
  | "slides"
  | "dodges";

export type EventMetric = "cities_unlocked" | "daily_completed";

export type MissionMetric = RunMetric | EventMetric;

export const MAX_METRICS: MissionMetric[] = ["score_best", "survive_seconds"];

export type MissionKind = "daily" | "weekly" | "special";

export interface MissionDef {
  id: string;
  kind: MissionKind;
  title: string;
  description: string;
  metric: MissionMetric;
  target: number;
  city?: CityId; // only runs in this city count
  reward: { coins: number; xp: number };
}

export const DAILY_POOL: MissionDef[] = [
  { id: "d_coins_500", kind: "daily", title: "Coin Sweep", description: "Collect 500 META Coins", metric: "coins", target: 500, reward: { coins: 150, xp: 80 } },
  { id: "d_games_3", kind: "daily", title: "Warm Up", description: "Play 3 games", metric: "games", target: 3, reward: { coins: 100, xp: 60 } },
  { id: "d_score_10k", kind: "daily", title: "High Scorer", description: "Reach 10,000 points in a single run", metric: "score_best", target: 10000, reward: { coins: 250, xp: 120 } },
  { id: "d_dist_5k", kind: "daily", title: "Road Warrior", description: "Run 5,000 meters", metric: "distance", target: 5000, reward: { coins: 150, xp: 80 } },
  { id: "d_power_3", kind: "daily", title: "Power Up", description: "Use 3 power-ups", metric: "powerups", target: 3, reward: { coins: 120, xp: 60 } },
  { id: "d_survive_120", kind: "daily", title: "Untouchable", description: "Survive 2 minutes in a single run without crashing", metric: "survive_seconds", target: 120, reward: { coins: 200, xp: 100 } },
  { id: "d_jumps_40", kind: "daily", title: "Sky High", description: "Jump 40 times", metric: "jumps", target: 40, reward: { coins: 100, xp: 50 } },
  { id: "d_slides_30", kind: "daily", title: "Low Rider", description: "Slide 30 times", metric: "slides", target: 30, reward: { coins: 100, xp: 50 } },
  { id: "d_dodge_120", kind: "daily", title: "Weaver", description: "Pass 120 obstacles", metric: "dodges", target: 120, reward: { coins: 130, xp: 70 } },
];

export const DAILY_COUNT = 4;

export const WEEKLY_MISSIONS: MissionDef[] = [
  { id: "w_games_20", kind: "weekly", title: "Committed", description: "Play 20 games", metric: "games", target: 20, reward: { coins: 600, xp: 300 } },
  { id: "w_coins_5000", kind: "weekly", title: "Treasury", description: "Collect 5,000 META Coins", metric: "coins", target: 5000, reward: { coins: 800, xp: 350 } },
  { id: "w_score_100k", kind: "weekly", title: "Six Figures", description: "Reach a combined score of 100,000", metric: "score_total", target: 100000, reward: { coins: 900, xp: 400 } },
  { id: "w_unlock_city", kind: "weekly", title: "New Horizons", description: "Unlock a new city", metric: "cities_unlocked", target: 1, reward: { coins: 700, xp: 300 } },
  { id: "w_daily_10", kind: "weekly", title: "Daily Grinder", description: "Complete 10 daily missions", metric: "daily_completed", target: 10, reward: { coins: 1000, xp: 500 } },
];

export interface Season {
  key: string; // YYYY-MM
  name: string;
  city: CityId;
  startsAt: string; // ISO
  endsAt: string; // ISO
}

// Limited-time season: rotates monthly and features one city.
export function seasonFor(date: Date): Season {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const city = CITIES[(y * 12 + m) % CITIES.length];
  const monthName = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return {
    key: `${y}-${String(m + 1).padStart(2, "0")}`,
    name: `${city.name} ${monthName} Rush`,
    city: city.id,
    startsAt: new Date(Date.UTC(y, m, 1)).toISOString(),
    endsAt: new Date(Date.UTC(y, m + 1, 1)).toISOString(),
  };
}

export function specialMissionsForCity(city: CityId): MissionDef[] {
  const cityName = CITIES.find((c) => c.id === city)!.name;
  return [
    { id: `s_${city}_runs`, kind: "special", title: `${cityName} Tour`, description: `Play 10 runs in ${cityName}`, metric: "games", target: 10, city, reward: { coins: 1200, xp: 500 } },
    { id: `s_${city}_score`, kind: "special", title: `${cityName} Champion`, description: `Score 25,000 in a single ${cityName} run`, metric: "score_best", target: 25000, city, reward: { coins: 2000, xp: 800 } },
    { id: `s_${city}_coins`, kind: "special", title: `${cityName} Collector`, description: `Collect 2,000 coins in ${cityName}`, metric: "coins", target: 2000, city, reward: { coins: 1500, xp: 600 } },
  ];
}

export function specialMissionsFor(date: Date): MissionDef[] {
  return specialMissionsForCity(seasonFor(date).city);
}

export const ALL_STATIC_MISSIONS: MissionDef[] = [...DAILY_POOL, ...WEEKLY_MISSIONS];

export const ALL_MISSIONS: MissionDef[] = [...ALL_STATIC_MISSIONS, ...CITIES.flatMap((c) => specialMissionsForCity(c.id))];

export function getMission(id: string): MissionDef | undefined {
  return ALL_MISSIONS.find((m) => m.id === id);
}
