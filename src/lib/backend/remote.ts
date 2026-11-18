// Online mode: Supabase Auth on the client, all game writes through the validating /api routes.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CityId } from "../data/cities";
import type { ItemSlot } from "../data/cosmetics";
import type { RunOutcome } from "../progression/engine";
import type { LeaderboardPeriod } from "../progression/periods";
import type { PlayerSettings, PlayerState } from "../progression/state";
import type { RunResult } from "../rules";
import type { Backend, Leaderboard, RunStart, TournamentDetail, TournamentView } from "./types";

export function onlineConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

let sb: SupabaseClient | null = null;
export function supabaseBrowser(): SupabaseClient {
  if (!sb) {
    sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return sb;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export class RemoteBackend implements Backend {
  mode = "online" as const;

  private async token() {
    const { data } = await supabaseBrowser().auth.getSession();
    return data.session?.access_token ?? null;
  }

  private async call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const t = await this.token();
    if (t) headers.Authorization = `Bearer ${t}`;
    else if (auth) throw new ApiError("Not signed in", 401);
    const res = await fetch(path, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
    return body as T;
  }

  private post<T>(path: string, body: unknown = {}) {
    return this.call<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  async load() {
    return (await this.call<{ state: PlayerState }>("/api/player")).state;
  }
  startRun(city: CityId) {
    return this.post<RunStart>("/api/run/start", { city });
  }
  finishRun(result: RunResult) {
    return this.post<{ state: PlayerState; outcome: RunOutcome }>("/api/run/finish", { result });
  }
  async claimMission(key: string) {
    return (await this.post<{ state: PlayerState }>("/api/missions/claim", { key })).state;
  }
  claimDaily() {
    return this.post<{ state: PlayerState; reward: { day: number; coins: number; itemId?: string } }>("/api/daily/claim");
  }
  async purchase(itemId: string) {
    return (await this.post<{ state: PlayerState }>("/api/shop/purchase", { itemId })).state;
  }
  async equip(itemId: string) {
    return (await this.post<{ state: PlayerState }>("/api/shop/equip", { itemId })).state;
  }
  async unequip(slot: ItemSlot) {
    return (await this.post<{ state: PlayerState }>("/api/shop/equip", { unequip: slot })).state;
  }
  async buyCity(cityId: CityId) {
    return (await this.post<{ state: PlayerState }>("/api/cities/unlock", { cityId })).state;
  }
  async rename(username: string) {
    return (await this.post<{ state: PlayerState }>("/api/profile", { username })).state;
  }
  async updateSettings(settings: Partial<PlayerSettings>) {
    return (await this.post<{ state: PlayerState }>("/api/profile", { settings })).state;
  }
  leaderboard(period: LeaderboardPeriod, city?: CityId | null) {
    const q = new URLSearchParams({ period });
    if (city) q.set("city", city);
    return this.call<Leaderboard>(`/api/leaderboard?${q}`, {}, false);
  }
  tournaments() {
    return this.call<TournamentView[]>("/api/tournaments", {}, false);
  }
  tournament(id: string) {
    return this.call<TournamentDetail>(`/api/tournaments?id=${encodeURIComponent(id)}`, {}, false);
  }
}
