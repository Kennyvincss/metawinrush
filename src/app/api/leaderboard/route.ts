import { isCityId } from "@/lib/data/cities";
import { json, open } from "@/lib/server/http";
import { admin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const PERIODS = ["daily", "weekly", "monthly", "alltime"];

interface Row {
  rank: number;
  user_id: string;
  username: string;
  character_id: string;
  level: number;
  score: number;
}

export const GET = open(async (req, user) => {
  const url = new URL(req.url);
  const period = PERIODS.includes(url.searchParams.get("period") ?? "") ? url.searchParams.get("period")! : "alltime";
  const cityParam = url.searchParams.get("city");
  const city = isCityId(cityParam) ? cityParam : null;
  const db = admin();
  const { data, error } = await db.rpc("leaderboard", { p_period: period, p_city: city, p_limit: 50 });
  if (error) throw new Error(error.message);
  let me = null;
  if (user) {
    const r = await db.rpc("leaderboard_rank", { p_user: user.id, p_period: period, p_city: city }).maybeSingle<{ rank: number; score: number; total: number }>();
    if (r.data) me = { rank: Number(r.data.rank), score: Number(r.data.score), total: Number(r.data.total) };
  }
  return json({
    scope: "global",
    entries: (data as Row[]).map((r) => ({ rank: Number(r.rank), userId: r.user_id, username: r.username, characterId: r.character_id, level: r.level, score: Number(r.score) })),
    me,
  });
});
