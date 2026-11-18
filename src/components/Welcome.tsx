"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useApp } from "./AppState";
import { Icon, Logo } from "./ui";

/** Shown in online mode when there is no Supabase session yet. */
export default function Welcome() {
  const { signInGuest, signInEmail } = useApp();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden px-5 py-10">
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-mw-violet/25 blur-3xl" />
      <div className="relative w-full max-w-sm text-center">
        <img src="/brand/character.jpg" alt="The Masked One" className="mx-auto h-44 w-44 animate-floaty rounded-[2rem] object-cover shadow-cyan" />
        <div className="mt-6 flex items-center justify-center gap-3">
          <Logo size={44} />
          <h1 className="heading text-3xl">
            Metawin <span className="text-gradient">Rush</span>
          </h1>
        </div>
        <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-[0.3em] text-white/55">Run · Collect · Compete · Win</p>
        <div className="panel-glow mt-8 space-y-3 p-5 text-left">
          <button
            className="btn-primary w-full py-3.5 text-base"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await signInGuest();
              setBusy(false);
            }}
            data-testid="guest"
          >
            <Icon name="play" strokeWidth={0} /> Play as guest
          </button>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-white/35">
            <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
          </div>
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              await signInEmail(email);
              setBusy(false);
            }}
          >
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm" />
            <button className="btn-ghost w-full" disabled={busy || !email.includes("@")}>
              <Icon name="mail" /> Email me a sign-in link
            </button>
          </form>
          <p className="text-[11px] leading-relaxed text-white/45">No passwords, no payments. META Coins are an in-game currency with no cash value.</p>
        </div>
      </div>
    </div>
  );
}
