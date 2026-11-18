import { isCityId } from "@/lib/data/cities";
import { GameRuleError } from "@/lib/progression/engine";
import { authed, json, readJson } from "@/lib/server/http";
import { loadPlayer } from "@/lib/server/repo";
import { admin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export const POST = authed(async (req, user) => {
  const { city } = await readJson<{ city: string }>(req);
  if (!isCityId(city)) throw new GameRuleError("Unknown city");
  const { state } = await loadPlayer(user.id);
  if (!state.unlockedCities.includes(city)) throw new GameRuleError("City is locked", 403);
  const db = admin();
  // Simple abuse guard: at most 40 runs started per 10 minutes.
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db.from("game_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("started_at", since);
  if ((count ?? 0) >= 40) throw new GameRuleError("Too many runs started — take a breather", 429);
  const seed = Math.floor(Math.random() * 2 ** 31);
  const { data, error } = await db.from("game_sessions").insert({ user_id: user.id, city_id: city, seed }).select("id, seed").single();
  if (error) throw new Error(error.message);
  return json({ sessionId: data.id, seed: Number(data.seed) });
});
