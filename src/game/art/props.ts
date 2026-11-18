// Roadside props (lamps, trees, kiosks, signs) and collectible / effect sprites.
import type { CityDef } from "@/lib/data/cities";
import { drawGlyph } from "@/lib/art/glyph";
import type { PowerUpKind } from "@/lib/rules";
import { glow, lg, makeCanvas, poly, rg, rr, shade, text, withAlpha, type C2D } from "./canvas";
import { palm, supertree } from "./skylines";

const PX = 48;

export type PropType = "lamp" | "palm" | "tree" | "vending" | "phonebox" | "hydrant" | "subway" | "supertree" | "billboard" | "trafficlight" | "bench" | "kiosk";

export interface PropTex {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

function lampHead(ctx: C2D, x: number, y: number, color: string, size: number) {
  ctx.fillStyle = rg(ctx, x, y, 2, size * 3, [withAlpha(color, 0.5), withAlpha(color, 0)]);
  ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6);
  glow(ctx, color, 20, () => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function paintProp(type: PropType, city: CityDef, variant = 0): PropTex {
  const p = city.palette;
  const dims: Record<PropType, [number, number]> = {
    lamp: [2.2, 7.5],
    palm: [5, 9],
    tree: [4.5, 6.5],
    vending: [1.1, 2.0],
    phonebox: [1.1, 2.6],
    hydrant: [0.6, 0.9],
    subway: [2.8, 3.2],
    supertree: [8, 16],
    billboard: [6, 8],
    trafficlight: [1.4, 5.2],
    bench: [2, 1],
    kiosk: [2.6, 2.8],
  };
  const [mw, mh] = dims[type];
  const w = mw * PX,
    h = mh * PX;
  const [c, ctx] = makeCanvas(w, h);
  switch (type) {
    case "lamp": {
      const pole = city.id === "dubai" ? "#c9a24a" : city.id === "london" || city.id === "paris" ? "#1c2420" : "#3b3f4c";
      ctx.fillStyle = pole;
      ctx.fillRect(w / 2 - 4, h * 0.08, 8, h * 0.92);
      if (city.id === "london" || city.id === "paris") {
        ctx.fillRect(w / 2 - 10, h * 0.85, 20, h * 0.15);
        ctx.fillStyle = "#151a17";
        poly(ctx, [
          [w / 2 - 16, h * 0.04],
          [w / 2 + 16, h * 0.04],
          [w / 2 + 10, h * 0.14],
          [w / 2 - 10, h * 0.14],
        ]);
        ctx.fill();
        lampHead(ctx, w / 2, h * 0.1, "#ffd98a", 9);
      } else {
        ctx.fillRect(w / 2, h * 0.08, w * 0.42, 6);
        lampHead(ctx, w / 2 + w * 0.38, h * 0.1, city.id === "tokyo" || city.id === "seoul" ? p.neon[1] : "#fff1c9", 8);
      }
      if (city.id === "tokyo" || city.id === "seoul") {
        // small hanging neon sign
        const col = p.neon[variant % p.neon.length];
        ctx.fillStyle = "#08040e";
        rr(ctx, w / 2 - 22, h * 0.3, 44, h * 0.32, 4);
        ctx.fill();
        glow(ctx, col, 12, () => {
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          rr(ctx, w / 2 - 20, h * 0.3 + 2, 40, h * 0.32 - 4, 3);
          ctx.stroke();
        });
        text(ctx, city.id === "tokyo" ? "ラーメン" : "치킨", w / 2, h * 0.32, 18, "#fff", { glow: col, vertical: true });
      }
      break;
    }
    case "palm":
      palm(ctx, w * 0.42, h, h * 0.8, city.id === "dubai" ? "#2c5a2a" : "#1f5a30");
      // trunk highlight
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = lg(ctx, 0, 0, w, 0, [withAlpha(p.horizonGlow, 0.25), "rgba(0,0,0,0)"]);
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      break;
    case "tree": {
      ctx.fillStyle = "#2a1d14";
      ctx.fillRect(w / 2 - 6, h * 0.5, 12, h * 0.5);
      const greens = city.id === "paris" ? ["#1f3a24", "#2d5232", "#3c6b3e"] : ["#174a2c", "#1f6b3c", "#2a8a4d"];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        ctx.fillStyle = greens[i % 3];
        ctx.beginPath();
        ctx.arc(w / 2 + Math.cos(a) * w * 0.26, h * 0.34 + Math.sin(a) * h * 0.18, w * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // string lights
      for (let i = 0; i < 18; i++) {
        glow(ctx, "#ffe9b0", 8, () => {
          ctx.fillStyle = "#fff4cc";
          ctx.fillRect(w * 0.15 + ((i * 37) % (w * 0.7)), h * 0.18 + ((i * 53) % (h * 0.35)), 3, 3);
        });
      }
      break;
    }
    case "vending": {
      const col = p.neon[variant % p.neon.length];
      ctx.fillStyle = lg(ctx, 0, 0, w, 0, ["#e8ecf5", "#a5abba"]);
      rr(ctx, 0, 0, w, h, 4);
      ctx.fill();
      ctx.fillStyle = withAlpha(col, 0.8);
      ctx.fillRect(5, 6, w - 10, h * 0.5);
      for (let r = 0; r < 4; r++)
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = ["#ff4d4d", "#4dd2ff", "#ffe14d", "#3dff9a"][(r + i) % 4];
          rr(ctx, 9 + i * ((w - 18) / 4), 10 + r * (h * 0.12), (w - 18) / 4 - 4, h * 0.09, 3);
          ctx.fill();
        }
      ctx.fillStyle = "#111";
      ctx.fillRect(8, h * 0.7, w - 16, h * 0.1);
      break;
    }
    case "phonebox": {
      ctx.fillStyle = lg(ctx, 0, 0, w, 0, ["#e3262f", "#a5121a"]);
      rr(ctx, 0, h * 0.06, w, h * 0.94, [10, 10, 2, 2]);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.fillRect(4, h * 0.1, w - 8, h * 0.06);
      text(ctx, "TELEPHONE", w / 2, h * 0.13, 8, "#fff");
      for (let r = 0; r < 4; r++)
        for (let i = 0; i < 2; i++) {
          ctx.fillStyle = "#ffe6a0";
          ctx.fillRect(8 + i * ((w - 16) / 2), h * 0.2 + r * h * 0.14, (w - 20) / 2, h * 0.11);
        }
      break;
    }
    case "hydrant": {
      ctx.fillStyle = lg(ctx, 0, 0, w, 0, ["#ff5a3d", "#b3260f"]);
      rr(ctx, w * 0.2, h * 0.15, w * 0.6, h * 0.85, 6);
      ctx.fill();
      ctx.fillRect(0, h * 0.4, w, h * 0.14);
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.16, w * 0.32, Math.PI, 0);
      ctx.fill();
      break;
    }
    case "subway": {
      ctx.strokeStyle = "#1a3a24";
      ctx.lineWidth = 6;
      ctx.strokeRect(6, h * 0.35, w - 12, h * 0.65);
      for (let x = 14; x < w - 10; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.35);
        ctx.lineTo(x, h * 0.62);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = "#0b0b0b";
      ctx.fillRect(10, h * 0.62, w - 20, h * 0.38);
      ctx.fillStyle = "#1c1c1c";
      for (let i = 0; i < 6; i++) ctx.fillRect(10, h * 0.66 + i * h * 0.055, w - 20, 3);
      for (const x of [10, w - 10]) {
        ctx.fillStyle = "#1a3a24";
        ctx.fillRect(x - 3, h * 0.12, 6, h * 0.25);
        lampHead(ctx, x, h * 0.1, "#3dff9a", 9);
      }
      ctx.fillStyle = "#111";
      rr(ctx, w * 0.2, h * 0.22, w * 0.6, h * 0.1, 3);
      ctx.fill();
      text(ctx, "SUBWAY", w / 2, h * 0.27, 14, "#fff");
      break;
    }
    case "supertree":
      supertree(ctx, w / 2, h, h * 0.96, variant % 2 ? "#ff5ad8" : "#7dffb2");
      break;
    case "billboard": {
      const col = p.neon[variant % p.neon.length];
      const col2 = p.neon[(variant + 1) % p.neon.length];
      ctx.fillStyle = "#2a2d36";
      ctx.fillRect(w / 2 - 7, h * 0.5, 14, h * 0.5);
      ctx.fillStyle = "#06040c";
      rr(ctx, 0, 0, w, h * 0.52, 8);
      ctx.fill();
      ctx.fillStyle = lg(ctx, 0, 0, w, h * 0.5, [shade(col, -0.6), "#0a0614", shade(col2, -0.6)]);
      rr(ctx, 6, 6, w - 12, h * 0.52 - 12, 6);
      ctx.fill();
      glow(ctx, col, 18, () => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 4;
        rr(ctx, 4, 4, w - 8, h * 0.52 - 8, 7);
        ctx.stroke();
      });
      drawGlyph(ctx, 16, h * 0.1, h * 0.27, "#fff", col, 16);
      const tx = (16 + h * 0.27 + 10 + w - 12) / 2;
      const tw = w - 12 - (16 + h * 0.27 + 10);
      text(ctx, "METAWIN", tx, h * 0.17, h * 0.075, "#fff", { glow: col2, maxWidth: tw });
      text(ctx, "RUSH", tx, h * 0.3, h * 0.1, col2, { glow: col2, maxWidth: tw });
      text(ctx, "RUN · COLLECT · COMPETE · WIN", w / 2, h * 0.44, h * 0.028, "#d8d8e8", { maxWidth: w - 24 });
      break;
    }
    case "trafficlight": {
      ctx.fillStyle = "#2a2d36";
      ctx.fillRect(w / 2 - 4, h * 0.3, 8, h * 0.7);
      ctx.fillStyle = "#14161c";
      rr(ctx, w / 2 - 18, h * 0.02, 36, h * 0.3, 6);
      ctx.fill();
      ["#ff3b30", "#ffcf3d", "#3dff9a"].forEach((col, i) => {
        const on = i === variant % 3;
        if (on) lampHead(ctx, w / 2, h * 0.07 + i * h * 0.09, col, 9);
        else {
          ctx.fillStyle = shade(col, -0.7);
          ctx.beginPath();
          ctx.arc(w / 2, h * 0.07 + i * h * 0.09, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      break;
    }
    case "bench": {
      ctx.fillStyle = "#3b2a1c";
      ctx.fillRect(0, h * 0.3, w, h * 0.16);
      ctx.fillRect(0, h * 0.55, w, h * 0.12);
      ctx.fillStyle = "#151515";
      ctx.fillRect(6, h * 0.3, 6, h * 0.7);
      ctx.fillRect(w - 12, h * 0.3, 6, h * 0.7);
      break;
    }
    case "kiosk": {
      const col = p.neon[variant % p.neon.length];
      ctx.fillStyle = "#1a1c22";
      rr(ctx, 0, h * 0.18, w, h * 0.82, 6);
      ctx.fill();
      ctx.fillStyle = withAlpha(col, 0.35);
      ctx.fillRect(6, h * 0.35, w - 12, h * 0.38);
      ctx.fillStyle = col;
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? col : "#ffffff";
        ctx.fillRect((i * w) / 6, 0, w / 6 + 1, h * 0.18);
      }
      text(ctx, city.id === "lagos" ? "PUFF-PUFF" : city.id === "singapore" ? "KOPI" : "SNACKS", w / 2, h * 0.27, 12, "#fff");
      break;
    }
  }
  return { canvas: c, w: mw, h: mh };
}

// ── Coins ────────────────────────────────────────────────────────────────

export function paintCoin(city: CityDef): HTMLCanvasElement {
  const S = 128;
  const [c, ctx] = makeCanvas(S, S);
  const { face, rim, glow: g, symbol } = city.coin;
  const cx = S / 2,
    cy = S / 2,
    R = S * 0.42;
  ctx.fillStyle = rg(ctx, cx, cy, R * 0.6, S * 0.5, [withAlpha(g, 0.55), withAlpha(g, 0)]);
  ctx.fillRect(0, 0, S, S);
  const shape = (rad: number) => {
    ctx.beginPath();
    if (symbol === "mw" && city.id === "seoul") {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = cx + Math.cos(a) * rad,
          y = cy + Math.sin(a) * rad;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    } else if (symbol === "diamond") {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const x = cx + Math.cos(a) * rad,
          y = cy + Math.sin(a) * rad;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    } else ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  };
  shape(R);
  ctx.fillStyle = lg(ctx, 0, cy - R, 0, cy + R, [shade(rim, 0.4), rim, shade(rim, -0.4)]);
  ctx.fill();
  shape(R * 0.8);
  ctx.fillStyle = lg(ctx, cx - R, cy - R, cx + R, cy + R, ["#ffffff", face, shade(face, -0.25)]);
  ctx.fill();
  // rim ornaments
  ctx.fillStyle = shade(face, 0.5);
  const orn = 12;
  for (let i = 0; i < orn; i++) {
    const a = (i / orn) * Math.PI * 2;
    const x = cx + Math.cos(a) * R * 0.9,
      y = cy + Math.sin(a) * R * 0.9;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    if (symbol === "star") {
      for (let k = 0; k < 10; k++) {
        const rr2 = k % 2 ? 2 : 5;
        const aa = (k / 10) * Math.PI * 2;
        k ? ctx.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2) : ctx.moveTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2);
      }
    } else if (symbol === "rose" || symbol === "leaf") {
      ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
    } else if (symbol === "wave") {
      ctx.arc(0, 0, 3, 0, Math.PI);
    } else if (symbol === "crown") {
      ctx.rect(-2, -4, 4, 8);
    } else ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawGlyph(ctx, cx - R * 0.5, cy - R * 0.5, R, lg(ctx, 0, cy - R, 0, cy + R, [shade(rim, -0.2), shade(rim, -0.55)]), undefined);
  // shine
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(cx - R * 0.35, cy - R * 0.45, R * 0.28, R * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

// ── Power-ups ────────────────────────────────────────────────────────────

export const POWERUP_COLORS: Record<PowerUpKind, string> = {
  magnet: "#ff3d7f",
  shield: "#59f3ff",
  scoreboost: "#ffe14d",
  coinboost: "#3dff9a",
  superjump: "#b44dff",
};

export function paintPowerUp(kind: PowerUpKind): HTMLCanvasElement {
  const S = 160;
  const [c, ctx] = makeCanvas(S, S);
  const col = POWERUP_COLORS[kind];
  const cx = S / 2,
    cy = S / 2;
  ctx.fillStyle = rg(ctx, cx, cy, 20, S / 2, [withAlpha(col, 0.6), withAlpha(col, 0)]);
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = rg(ctx, cx - 14, cy - 18, 4, 56, ["#ffffff", shade(col, -0.1), shade(col, -0.6)]);
  ctx.beginPath();
  ctx.arc(cx, cy, 50, 0, Math.PI * 2);
  ctx.fill();
  glow(ctx, col, 18, () => {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.stroke();
  });
  paintPowerIcon(ctx, kind, cx, cy, 1, "#0b0614");
  return c;
}

export function paintPowerIcon(ctx: C2D, kind: PowerUpKind, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (kind) {
    case "magnet":
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(0, -2, 18, Math.PI, 0);
      ctx.moveTo(-18, -2);
      ctx.lineTo(-18, 20);
      ctx.moveTo(18, -2);
      ctx.lineTo(18, 20);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-24, 16, 12, 10);
      ctx.fillRect(12, 16, 12, 10);
      break;
    case "shield":
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(24, -18);
      ctx.quadraticCurveTo(24, 16, 0, 30);
      ctx.quadraticCurveTo(-24, 16, -24, -18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      drawGlyph(ctx as CanvasRenderingContext2D, -12, -12, 24, "#ffffff");
      break;
    case "scoreboost":
      text(ctx, "×2", 0, 2, 40, color, { weight: "900" });
      break;
    case "coinboost":
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(-6, 14 - i * 11, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      text(ctx, "+", 18, -14, 30, color, { weight: "900" });
      break;
    case "superjump":
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(20, -6);
      ctx.lineTo(8, -6);
      ctx.lineTo(8, 10);
      ctx.lineTo(-8, 10);
      ctx.lineTo(-8, -6);
      ctx.lineTo(-20, -6);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(-14, 16 + i * 4);
        ctx.lineTo(14, 18 + i * 4);
      }
      ctx.stroke();
      break;
  }
  ctx.restore();
}

// ── Effect sprites ───────────────────────────────────────────────────────

export function paintFx(): Record<string, HTMLCanvasElement> {
  const out: Record<string, HTMLCanvasElement> = {};
  {
    const [c, ctx] = makeCanvas(64, 64);
    ctx.fillStyle = rg(ctx, 32, 32, 0, 32, ["rgba(255,255,255,1)", "rgba(255,255,255,0.5)", "rgba(255,255,255,0)"]);
    ctx.fillRect(0, 0, 64, 64);
    out.dot = c;
  }
  {
    const [c, ctx] = makeCanvas(64, 64);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const r = k % 2 ? 6 : 30;
      const a = (k / 8) * Math.PI * 2;
      k ? ctx.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r) : ctx.moveTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    ctx.fill();
    out.star = c;
  }
  {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 8;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();
    out.ring = c;
  }
  {
    const [c, ctx] = makeCanvas(128, 24);
    ctx.fillStyle = lg(ctx, 0, 0, 128, 0, ["rgba(255,255,255,0)", "rgba(255,255,255,1)", "rgba(255,255,255,0)"]);
    ctx.fillRect(0, 8, 128, 8);
    out.streak = c;
  }
  {
    const [c, ctx] = makeCanvas(128, 48);
    ctx.fillStyle = rg(ctx, 64, 24, 0, 64, ["rgba(0,0,0,0.65)", "rgba(0,0,0,0)"]);
    ctx.save();
    ctx.scale(1, 0.375);
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.restore();
    ctx.fill();
    out.shadow = c;
  }
  {
    const [c, ctx] = makeCanvas(16, 24);
    ctx.fillStyle = "#fff";
    ctx.fillRect(4, 0, 8, 24);
    out.bit = c;
  }
  {
    const [c, ctx] = makeCanvas(8, 48);
    ctx.fillStyle = lg(ctx, 0, 0, 0, 48, ["rgba(255,255,255,0)", "rgba(255,255,255,0.8)"]);
    ctx.fillRect(3, 0, 2, 48);
    out.rain = c;
  }
  {
    // glyph for Metawin bonus moments
    const [c, ctx] = makeCanvas(128, 128);
    drawGlyph(ctx, 14, 14, 100, "#ffffff", "#ffffff", 16);
    out.glyph = c;
  }
  return out;
}
