import "server-only";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { GameRuleError } from "../progression/engine";
import { serverConfigured, userFromRequest } from "./supabase";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new GameRuleError("Invalid JSON body");
  }
}

type Handler = (req: Request, user: User) => Promise<Response>;
type OptionalHandler = (req: Request, user: User | null) => Promise<Response>;

function fail(e: unknown) {
  if (e instanceof GameRuleError) return json({ error: e.message }, e.code);
  console.error(e);
  return json({ error: "Server error" }, 500);
}

/** Wrap an API route that requires a signed-in player. */
export function authed(fn: Handler) {
  return async (req: Request) => {
    if (!serverConfigured()) return json({ error: "Online mode is not configured" }, 503);
    try {
      const user = await userFromRequest(req);
      if (!user) return json({ error: "Not signed in" }, 401);
      return await fn(req, user);
    } catch (e) {
      return fail(e);
    }
  };
}

/** Wrap a public API route; the player is resolved if a token is present. */
export function open(fn: OptionalHandler) {
  return async (req: Request) => {
    if (!serverConfigured()) return json({ error: "Online mode is not configured" }, 503);
    try {
      return await fn(req, await userFromRequest(req));
    } catch (e) {
      return fail(e);
    }
  };
}
