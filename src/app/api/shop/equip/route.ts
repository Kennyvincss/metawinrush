import type { ItemSlot } from "@/lib/data/cosmetics";
import { equipItem, unequipSlot } from "@/lib/progression/engine";
import { authed, json, readJson } from "@/lib/server/http";
import { mutate } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export const POST = authed(async (req, user) => {
  const body = await readJson<{ itemId?: string; unequip?: ItemSlot }>(req);
  const out = await mutate(user.id, (s) => ({ state: body.unequip ? unequipSlot(s, body.unequip) : equipItem(s, String(body.itemId)), result: null }));
  return json({ state: out.state });
});
