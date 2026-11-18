"use client";
/* eslint-disable @next/next/no-img-element */
import { memo, useEffect, useRef, type ReactNode } from "react";
import { paintCharacterFront } from "@/lib/art/character";
import { drawGlyph } from "@/lib/art/glyph";
import { getCity, type CityId } from "@/lib/data/cities";
import { getLook } from "@/lib/data/cosmetics";
import { paintSky, paintSkylineFar, paintSkylineNear } from "@/game/art/skylines";
import { useApp } from "./AppState";

// ── Icons (inline SVG, no emoji) ─────────────────────────────────────────
const PATHS: Record<string, string> = {
  home: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  city: "M3 21V9l6-3v15M9 21V3l8 4v14M17 21v-9l4 2v7M3 21h18M12 8h2M12 11h2M12 14h2",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6",
  swords: "M14.5 17.5 21 11V3h-8l-6.5 6.5M13 19l-6-6M16 16l4 4M19 21l2-2M10 14.5 3 21.5M5 17l2 2",
  bag: "M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2",
  user: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM4 21a8 8 0 0 1 16 0",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  medal: "M7 3h4l1 5M17 3h-4l-1 5M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 12.5l1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 14.8l2-.3z",
  gift: "M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7S10.5 3 8 3.5 6.5 7 12 7zM12 7s1.5-4 4-3.5S17.5 7 12 7z",
  play: "M7 4.5v15l13-7.5z",
  pause: "M7 4h3.5v16H7zM13.5 4H17v16h-3.5z",
  back: "M15 5l-7 7 7 7",
  lock: "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  check: "M5 12.5l4.5 4.5L19 7.5",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v13M7.5 7.5 12 3l4.5 4.5",
  music: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  sound: "M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
  mute: "M4 9h4l5-4v14l-5-4H4zM17 9l5 5M22 9l-5 5",
  x: "M6 6l12 12M18 6 6 18",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  crown: "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z",
  road: "M8 3 4 21M16 3l4 18M12 4v3M12 10v3M12 16v3",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z",
  plane: "M10.5 14 3 12l1.5-1.5L11 11l5-6.5a1.8 1.8 0 0 1 2.6 2.6L12.5 13l.5 6.5L11.5 21z",
  vault: "M4 4h16v16H4zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM12 8.5V7M12 17v-1.5M7 20v1.5M17 20v1.5",
  runner: "M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 21l3.5-5 3 2V12l-3-2-3 3M12.5 12l3 3 3.5-1M9.5 10l3.5-3 3 3 3 .5",
  torii: "M3 5c6 1.3 12 1.3 18 0M5 9h14M7 6.5V21M17 6.5V21",
  lion: "M12 20a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM9.5 12h.01M14.5 12h.01M10.5 15.5c1 .8 2 .8 3 0M5 9 3 6M19 9l2-3M12 5V2",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  logout: "M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01",
  replay: "M4 12a8 8 0 1 0 2.3-5.7M4 4v4.5h4.5",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
};

export function Icon({ name, className = "h-5 w-5", strokeWidth = 1.9 }: { name: keyof typeof PATHS | string; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={strokeWidth === 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}

// ── Brand ─────────────────────────────────────────────────────────────────
export function Logo({ size = 40, ring = true }: { size?: number; ring?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {ring && <div className="absolute -inset-0.5 animate-spinSlow rounded-full bg-[conic-gradient(from_0deg,#38e8ff,transparent_40%,#b44dff,transparent_80%,#38e8ff)] opacity-80" />}
      <img src="/brand/logo.jpg" alt="Metawin" className="relative h-full w-full rounded-full object-cover" />
    </div>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`leading-none ${className}`}>
      <div className="heading text-[0.62em] text-mw-cyan/90">Metawin</div>
      <div className="heading text-gradient">Rush</div>
    </div>
  );
}

export function CoinIcon({ className = "h-5 w-5" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const S = c.width;
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, "#fff3c4");
    g.addColorStop(0.5, "#ffd23f");
    g.addColorStop(1, "#b8860b");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.47, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,80,0,.6)";
    ctx.lineWidth = S * 0.05;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    drawGlyph(ctx, S * 0.26, S * 0.26, S * 0.48, "#6b4400");
  }, []);
  return <canvas ref={ref} width={64} height={64} className={className} aria-label="META Coins" />;
}

export function Coins({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-display font-bold tabular-nums text-amber-200 ${className}`}>
      <CoinIcon className="h-[1.15em] w-[1.15em]" />
      {value.toLocaleString()}
    </span>
  );
}

// ── Character portraits ──────────────────────────────────────────────────
export const Portrait = memo(function Portrait({ characterId, helmet = "helm_standard", size = 96, className = "", background = true }: { characterId: string; helmet?: string; size?: number; className?: string; background?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const r = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * r;
    c.height = size * r;
    paintCharacterFront(c, getLook(characterId), helmet, { background });
  }, [characterId, helmet, size, background]);
  return <canvas ref={ref} style={{ width: size, height: size }} className={className} />;
});

/** Avatar: the real Metawin artwork for the default look, procedural portraits for variants. */
export function Avatar({ characterId, helmet, size = 40, className = "" }: { characterId: string; helmet?: string; size?: number; className?: string }) {
  if (characterId === "char_masked" && (!helmet || helmet === "helm_standard"))
    return <img src="/brand/character.jpg" alt="" width={size} height={size} className={`rounded-xl object-cover ${className}`} style={{ width: size, height: size }} />;
  return <Portrait characterId={characterId} helmet={helmet} size={size} className={`rounded-xl ${className}`} />;
}

// ── City art thumbnail (sky + skyline painted from the same generators as the game) ──
export const CityArt = memo(function CityArt({ cityId, className = "", locked = false }: { cityId: CityId; className?: string; locked?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const city = getCity(cityId);
    const W = c.width,
      H = c.height;
    ctx.drawImage(paintSky(city), 0, 0, 1024, 1024, 0, 0, W, H * 1.15);
    const far = paintSkylineFar(city);
    const near = paintSkylineNear(city);
    const s = H / 700;
    ctx.drawImage(far, 400, 0, W / s, 760, 0, H - 760 * s * 0.95, W, 760 * s * 0.95);
    ctx.drawImage(near, 800, 0, W / (s * 0.9), 420, 0, H - 420 * s * 0.9, W, 420 * s * 0.9);
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, "rgba(5,3,11,0)");
    g.addColorStop(1, "rgba(5,3,11,0.92)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }, [cityId]);
  return <canvas ref={ref} width={480} height={300} className={`${className} ${locked ? "grayscale-[.7] brightness-[.55]" : ""}`} />;
});

// ── Layout helpers ───────────────────────────────────────────────────────
export function Progress({ value, max, className = "", color = "from-mw-violet to-mw-cyan" }: { value: number; max: number; className?: string; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-white/10 ${className}`} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { go } = useApp();
  return (
    <div className="mb-4 flex items-center gap-3">
      <button onClick={() => go("home")} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 hover:border-mw-cyan/60" aria-label="Back">
        <Icon name="back" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="heading truncate text-lg sm:text-xl">{title}</h1>
        {subtitle && <p className="truncate text-xs text-white/55">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose(): void; children: ReactNode; title?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel-glow relative max-h-[90dvh] w-full max-w-md animate-pop overflow-y-auto p-5 scroll-thin" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <button onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close">
          <Icon name="x" />
        </button>
        {title && <h2 className="heading mb-4 pr-10 text-lg">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto max-w-sm animate-rise rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-lg backdrop-blur ${
            t.kind === "error"
              ? "border-red-400/40 bg-red-950/85 text-red-100"
              : t.kind === "success"
                ? "border-emerald-400/40 bg-emerald-950/85 text-emerald-100"
                : t.kind === "reward"
                  ? "border-amber-300/50 bg-amber-950/85 text-amber-100"
                  : "border-white/15 bg-ink-800/90 text-white"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-mw-violet/15 text-mw-violet">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <div className="heading text-sm">{title}</div>
      <p className="max-w-xs text-sm text-white/60">{text}</p>
    </div>
  );
}

export function timeLeft(iso: string, now = Date.now()) {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return "ended";
  const d = Math.floor(ms / 86400000),
    h = Math.floor((ms % 86400000) / 3600000),
    m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}
