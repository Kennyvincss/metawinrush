// METAWIN ARENA: asynchronous, score-based tournaments. Each tournament has a fixed time window;
// a player's best run inside the window (in the right city, if city-specific) is their entry.
// This is NOT live multiplayer — see README "Arena architecture" for the real-time extension point.
import { CITIES, type CityId } from "./data/cities";
import { seasonFor } from "./data/missions";
import { dayKey, startOfDay, startOfMonth, startOfWeek, weekKey } from "./progression/periods";

export type TournamentKind = "daily" | "weekly" | "city" | "special";

export interface TournamentDef {
  id: string;
  name: string;
  kind: TournamentKind;
  city: CityId | null;
  startsAt: string;
  endsAt: string;
  description: string;
}

export function featuredCityOfWeek(now: Date): CityId {
  const wk = Math.floor(startOfWeek(now).getTime() / (7 * 86400000));
  return CITIES[wk % CITIES.length].id;
}

export function currentTournaments(now: Date): TournamentDef[] {
  const d0 = startOfDay(now);
  const d1 = new Date(d0.getTime() + 86400000);
  const w0 = startOfWeek(now);
  const w1 = new Date(w0.getTime() + 7 * 86400000);
  const m0 = startOfMonth(now);
  const m1 = new Date(Date.UTC(m0.getUTCFullYear(), m0.getUTCMonth() + 1, 1));
  const fc = featuredCityOfWeek(now);
  const fcName = CITIES.find((c) => c.id === fc)!.name;
  const season = seasonFor(now);
  const sName = CITIES.find((c) => c.id === season.city)!.name;
  return [
    { id: `daily-${dayKey(now)}`, name: "Daily Dash", kind: "daily", city: null, startsAt: d0.toISOString(), endsAt: d1.toISOString(), description: "Best single run in any city today." },
    { id: `weekly-${weekKey(now)}`, name: "Weekly Grand Prix", kind: "weekly", city: null, startsAt: w0.toISOString(), endsAt: w1.toISOString(), description: "Best single run in any city this week." },
    { id: `city-${weekKey(now)}-${fc}`, name: `${fcName} Showdown`, kind: "city", city: fc, startsAt: w0.toISOString(), endsAt: w1.toISOString(), description: `This week's city battle. Only runs in ${fcName} count.` },
    { id: `special-${season.key}`, name: season.name, kind: "special", city: season.city, startsAt: m0.toISOString(), endsAt: m1.toISOString(), description: `Monthly special event in ${sName}.` },
  ];
}

export function tournamentsForRun(city: CityId, now: Date): TournamentDef[] {
  return currentTournaments(now).filter((t) => t.city === null || t.city === city);
}
