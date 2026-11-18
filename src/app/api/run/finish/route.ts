import { applyRun, GameRuleError } from "@/lib/progression/engine";
import type { RunResult } from "@/lib/rules";
import { authed, json, readJson } from "@/lib/server/http";
import { ensureTournaments, mutate } from "@/lib/server/repo";
import { admin } from "@/lib/server/supabase";
import { tournamentsForRun } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

export const POST = authed(async (req, user) => {
  const { result } = await readJson<{ result: RunResult }>(req);
  if (!result || typeof result.sessionId !== "string") throw new GameRuleError("Missing run result");
  const db = admin();
  const { data: session } = await db.from("game_sessions").select("*").eq("id", result.sessionId).eq("user_id", user.id).maybeSingle();
  if (!session) throw new GameRuleError("Unknown run session", 404);
  if (session.status !== "active") throw new GameRuleError("This run was already submitted", 409);
  if (session.city_id !== result.city) throw new GameRuleError("City does not match the session", 422);
  const serverElapsedMs = Date.now() - new Date(session.started_at).getTime();
  const now = new Date();
  await ensureTournaments(now);
  try {
    const out = await mutate(user.id, (state, ctx) => {
      const { state: next, outcome } = applyRun(state, result, ctx, serverElapsedMs);
      return {
        state: next,
        result: outcome,
        extras: {
          session: { id: session.id, status: "finished" as const },
          score: { session_id: session.id, city_id: result.city, score: Math.floor(result.score), distance: Math.floor(result.distance), coins: result.coins, duration_ms: Math.floor(result.durationMs) },
          tournaments: tournamentsForRun(result.city, ctx.now).map((t) => ({ tournament_id: t.id, score: Math.floor(result.score) })),
        },
      };
    });
    const { data: rank } = await db.rpc("leaderboard_rank", { p_user: user.id, p_period: "alltime", p_city: null }).maybeSingle<{ rank: number }>();
    return json({ state: out.state, outcome: { ...out.result, rank: rank?.rank ?? null } });
  } catch (e) {
    if (e instanceof GameRuleError && e.code === 422) {
      await db.from("game_sessions").update({ status: "rejected", reject_reason: e.message, finished_at: new Date().toISOString() }).eq("id", session.id).eq("status", "active");
    }
    throw e;
  }
});
