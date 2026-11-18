import type { CityId } from "./cities";

// Lifetime stats an achievement can measure.
export type AchievementMetric =
  | { kind: "stat"; stat: "gamesPlayed" | "totalCoins" | "highScore" | "totalDistance" | "dodges" | "powerupsUsed" | "longestRunMs" }
  | { kind: "level" }
  | { kind: "citiesUnlocked" }
  | { kind: "citiesPlayed" }
  | { kind: "cityDistance"; city: CityId }
  | { kind: "cityBest"; city: CityId };

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: "flag" | "coin" | "trophy" | "crown" | "torii" | "lion" | "runner" | "vault" | "shield" | "road" | "globe" | "bolt" | "clock" | "plane";
  metric: AchievementMetric;
  target: number;
  reward: { coins: number; xp: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_run", title: "First Run", description: "Finish your first run", icon: "flag", metric: { kind: "stat", stat: "gamesPlayed" }, target: 1, reward: { coins: 100, xp: 50 } },
  { id: "coins_1000", title: "First 1,000 Coins", description: "Collect 1,000 META Coins in total", icon: "coin", metric: { kind: "stat", stat: "totalCoins" }, target: 1000, reward: { coins: 200, xp: 100 } },
  { id: "score_10k", title: "10,000 Score", description: "Score 10,000 in a single run", icon: "trophy", metric: { kind: "stat", stat: "highScore" }, target: 10000, reward: { coins: 300, xp: 150 } },
  { id: "score_100k", title: "100,000 Score", description: "Score 100,000 in a single run", icon: "crown", metric: { kind: "stat", stat: "highScore" }, target: 100000, reward: { coins: 3000, xp: 1500 } },
  { id: "tokyo_explorer", title: "Tokyo Explorer", description: "Run 10,000 m through Tokyo", icon: "torii", metric: { kind: "cityDistance", city: "tokyo" }, target: 10000, reward: { coins: 400, xp: 200 } },
  { id: "lagos_legend", title: "Lagos Legend", description: "Score 25,000 in a single Lagos run", icon: "lion", metric: { kind: "cityBest", city: "lagos" }, target: 25000, reward: { coins: 1200, xp: 600 } },
  { id: "master_runner", title: "Master Runner", description: "Reach player level 20", icon: "runner", metric: { kind: "level" }, target: 20, reward: { coins: 2500, xp: 0 } },
  { id: "coin_collector", title: "Coin Collector", description: "Collect 25,000 META Coins in total", icon: "vault", metric: { kind: "stat", stat: "totalCoins" }, target: 25000, reward: { coins: 1500, xp: 700 } },
  { id: "obstacle_master", title: "Obstacle Master", description: "Pass 1,000 obstacles", icon: "shield", metric: { kind: "stat", stat: "dodges" }, target: 1000, reward: { coins: 800, xp: 400 } },
  { id: "marathon_runner", title: "Marathon Runner", description: "Run 42,195 m in total", icon: "road", metric: { kind: "stat", stat: "totalDistance" }, target: 42195, reward: { coins: 1000, xp: 500 } },
  { id: "survivor", title: "Survivor", description: "Survive 5 minutes in a single run", icon: "clock", metric: { kind: "stat", stat: "longestRunMs" }, target: 300000, reward: { coins: 1000, xp: 500 } },
  { id: "power_player", title: "Power Player", description: "Use 100 power-ups", icon: "bolt", metric: { kind: "stat", stat: "powerupsUsed" }, target: 100, reward: { coins: 700, xp: 350 } },
  { id: "globetrotter", title: "Globetrotter", description: "Play a run in 5 different cities", icon: "plane", metric: { kind: "citiesPlayed" }, target: 5, reward: { coins: 1000, xp: 500 } },
  { id: "world_traveler", title: "World Traveler", description: "Unlock all 8 cities", icon: "globe", metric: { kind: "citiesUnlocked" }, target: 8, reward: { coins: 5000, xp: 2000 } },
];

export function getAchievement(id: string) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
