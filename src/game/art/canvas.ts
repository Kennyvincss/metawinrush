// Canvas helpers for procedural texture painting.
export type C2D = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, C2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return [c, c.getContext("2d")!];
}

export function lg(ctx: C2D, x0: number, y0: number, x1: number, y1: number, stops: (string | [number, string])[]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((s, i) => (Array.isArray(s) ? g.addColorStop(s[0], s[1]) : g.addColorStop(i / Math.max(1, stops.length - 1), s)));
  return g;
}

export function rg(ctx: C2D, x: number, y: number, r0: number, r1: number, stops: (string | [number, string])[]) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach((s, i) => (Array.isArray(s) ? g.addColorStop(s[0], s[1]) : g.addColorStop(i / Math.max(1, stops.length - 1), s)));
  return g;
}

export function rr(ctx: C2D, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
  const [tl, tr, br, bl] = typeof r === "number" ? [r, r, r, r] : r;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

export function glow(ctx: C2D, color: string, blur: number, fn: () => void) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

export function poly(ctx: C2D, pts: [number, number][]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

export function shade(hex: string, amt: number): string {
  // amt -1..1 : darken / lighten
  const n = parseInt(hex.slice(1, 7), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  if (amt < 0) {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  } else {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  }
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

export function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function text(ctx: C2D, str: string, x: number, y: number, size: number, color: string, opts: { font?: string; align?: CanvasTextAlign; glow?: string; weight?: string; vertical?: boolean; maxWidth?: number } = {}) {
  ctx.save();
  ctx.font = `${opts.weight ?? "800"} ${size}px ${opts.font ?? "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"}`;
  ctx.textAlign = opts.align ?? "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = size * 0.6;
  }
  if (opts.vertical) {
    [...str].forEach((ch, i) => ctx.fillText(ch, x, y + i * size * 1.05));
  } else if (opts.maxWidth) ctx.fillText(str, x, y, opts.maxWidth);
  else ctx.fillText(str, x, y);
  ctx.restore();
}

/** Seeded RNG for deterministic textures. */
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a ^= a << 13;
    a ^= a >>> 17;
    a ^= a << 5;
    return (a >>> 0) / 4294967296;
  };
}
