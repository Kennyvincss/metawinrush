import { claimDaily } from "@/lib/progression/engine";
import { authed, json } from "@/lib/server/http";
import { mutate } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export const POST = authed(async (_req, user) => {
  const out = await mutate(user.id, (s, ctx) => {
    const { state, reward } = claimDaily(s, ctx);
    return {
      state,
      result: reward,
      extras: { daily_claim: { claimed_on: state.daily.lastClaimedOn!, day_index: reward.day, coins: reward.coins, item_id: reward.itemId ?? null } },
    };
  });
  return json({ state: out.state, reward: out.result });
});
