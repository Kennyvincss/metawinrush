// UTC period keys used by missions, leaderboards and tournaments.

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO-8601 week key, e.g. 2026-W47. */
export function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const day = s.getUTCDay() || 7;
  s.setUTCDate(s.getUTCDate() - (day - 1));
  return s;
}

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "alltime";

export function periodStart(period: LeaderboardPeriod, now: Date): Date | null {
  switch (period) {
    case "daily":
      return startOfDay(now);
    case "weekly":
      return startOfWeek(now);
    case "monthly":
      return startOfMonth(now);
    default:
      return null;
  }
}

export function daysBetween(aKey: string, bKey: string): number {
  return Math.round((Date.parse(bKey + "T00:00:00Z") - Date.parse(aKey + "T00:00:00Z")) / 86400000);
}

/** Deterministic small hash for rotating pools. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
