// Daily login rewards and the XP / level curve.

export interface DailyReward {
  day: number; // 1..7
  coins: number;
  itemId?: string; // cosmetic reward; if already owned, `fallbackCoins` is paid instead
  fallbackCoins?: number;
}

export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, coins: 100 },
  { day: 2, coins: 150 },
  { day: 3, coins: 200 },
  { day: 4, coins: 250 },
  { day: 5, coins: 350 },
  { day: 6, coins: 500 },
  { day: 7, coins: 0, itemId: "helm_halo", fallbackCoins: 1000 },
];

export const MAX_LEVEL = 100;

/** Total XP required to reach `level` (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(300 * Math.pow(level - 1, 1.55));
}

export function levelForXp(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
}

export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - cur, needed: next - cur, pct: level >= MAX_LEVEL ? 1 : (xp - cur) / (next - cur) };
}

/** Coins granted when reaching a level. */
export function levelUpCoins(level: number): number {
  return 50 + level * 25;
}
