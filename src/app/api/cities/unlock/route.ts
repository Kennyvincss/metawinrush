import { buyCity } from "@/lib/progression/engine";
import { authed, json, readJson } from "@/lib/server/http";
import { mutate } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export const POST = authed(async (req, user) => {
  const { cityId } = await readJson<{ cityId: string }>(req);
  const out = await mutate(user.id, (s, ctx) => ({ state: buyCity(s, String(cityId), ctx), result: null }));
  return json({ state: out.state });
});
