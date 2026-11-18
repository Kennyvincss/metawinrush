import { GameRuleError, renamePlayer } from "@/lib/progression/engine";
import type { PlayerSettings } from "@/lib/progression/state";
import { authed, json, readJson } from "@/lib/server/http";
import { mutate } from "@/lib/server/repo";
import { admin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export const POST = authed(async (req, user) => {
  const body = await readJson<{ username?: string; settings?: Partial<PlayerSettings> }>(req);
  if (body.username) {
    const { data } = await admin().from("profiles").select("id").ilike("username", body.username).neq("id", user.id).maybeSingle();
    if (data) throw new GameRuleError("That username is taken", 409);
  }
  const out = await mutate(user.id, (s) => {
    let next = body.username ? renamePlayer(s, body.username) : s;
    if (body.settings) {
      const clean: Partial<PlayerSettings> = {};
      for (const k of ["music", "sfx", "tutorialDone"] as const) if (typeof body.settings[k] === "boolean") clean[k] = body.settings[k];
      next = { ...next, settings: { ...next.settings, ...clean } };
    }
    return { state: next, result: null };
  });
  return json({ state: out.state });
});
