import { json, open } from "@/lib/server/http";
import { ensureTournaments } from "@/lib/server/repo";
import { admin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

interface Summary {
  tournament_id: string;
  participants: number;
  top_score: number | null;
  my_score: number | null;
  my_rank: number | null;
}
interface Row {
  rank: number;
  user_id: string;
  username: string;
  character_id: string;
  level: number;
  score: number;
}

export const GET = open(async (req, user) => {
  const defs = await ensureTournaments();
  const db = admin();
  const id = new URL(req.url).searchParams.get("id");
  const { data, error } = await db.rpc("tournament_summary", { p_ids: defs.map((d) => d.id), p_user: user?.id ?? null });
  if (error) throw new Error(error.message);
  const byId = new Map((data as Summary[]).map((s) => [s.tournament_id, s]));
  const views = defs.map((d) => {
    const s = byId.get(d.id);
    return {
      ...d,
      participants: Number(s?.participants ?? 0),
      topScore: s?.top_score == null ? null : Number(s.top_score),
      myScore: s?.my_score == null ? null : Number(s.my_score),
      myRank: s?.my_rank == null ? null : Number(s.my_rank),
    };
  });
  if (id) {
    const view = views.find((v) => v.id === id);
    if (!view) return json({ error: "Tournament not found" }, 404);
    const b = await db.rpc("tournament_board", { p_tournament: id, p_limit: 50 });
    if (b.error) throw new Error(b.error.message);
    return json({
      ...view,
      entries: (b.data as Row[]).map((r) => ({ rank: Number(r.rank), userId: r.user_id, username: r.username, characterId: r.character_id, level: r.level, score: Number(r.score) })),
    });
  }
  return json(views);
});
