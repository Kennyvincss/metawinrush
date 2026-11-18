import { authed, json } from "@/lib/server/http";
import { loadPlayer } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export const GET = authed(async (_req, user) => {
  const preferred = (user.user_metadata?.username as string | undefined) ?? undefined;
  const { state } = await loadPlayer(user.id, new Date(), preferred);
  return json({ state });
});
