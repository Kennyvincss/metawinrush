// Low obstacles (jump over) and overhead obstacles (slide under).
import { drawGlyph } from "@/lib/art/glyph";
import { glow, lg, makeCanvas, rr, shade, text, type C2D } from "./canvas";

const PX = 80;

export type LowType = "jersey" | "stripe" | "turnstile" | "cones" | "planter" | "sandbags";
export type OverheadType = "gate" | "scaffold" | "gantry" | "banner" | "awning";

export const LOW_DIMS: Record<LowType, [number, number]> = {
  jersey: [2.1, 0.95],
  stripe: [2.1, 1.05],
  turnstile: [2.1, 1.05],
  cones: [2.1, 0.9],
  planter: [2.1, 0.95],
  sandbags: [2.1, 0.85],
};

// Overhead obstacles span a lane: posts at the lane edges and a beam from 1.2 m to `top`.
export const OVERHEAD_W = 2.3;
export const OVERHEAD_BEAM_BOTTOM = 1.2;
export const OVERHEAD_H: Record<OverheadType, number> = { gate: 2.7, scaffold: 2.6, gantry: 2.9, banner: 2.7, awning: 2.6 };

function stripes(ctx: C2D, x: number, y: number, w: number, h: number, a: string, b: string, step = 18) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = a;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = b;
  for (let i = -h; i < w + h; i += step * 2) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + step, y + h);
    ctx.lineTo(x + i + step + h, y);
    ctx.lineTo(x + i + h, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function paintLow(type: LowType, accent: string, accent2 = "#ffffff"): HTMLCanvasElement {
  const [mw, mh] = LOW_DIMS[type];
  const w = mw * PX,
    h = mh * PX;
  const [c, ctx] = makeCanvas(w, h);
  switch (type) {
    case "jersey": {
      ctx.fillStyle = lg(ctx, 0, 0, 0, h, ["#d9dbe2", "#9da1ad", "#5b5f6b"]);
      ctx.beginPath();
      ctx.moveTo(w * 0.12, 0);
      ctx.lineTo(w * 0.88, 0);
      ctx.lineTo(w * 0.92, h * 0.55);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.lineTo(w * 0.08, h * 0.55);
      ctx.closePath();
      ctx.fill();
      stripes(ctx, w * 0.1, h * 0.18, w * 0.8, h * 0.22, accent, accent2, 16);
      glow(ctx, accent, 14, () => {
        ctx.fillStyle = accent;
        ctx.fillRect(w * 0.1, h * 0.6, w * 0.8, 4);
      });
      break;
    }
    case "stripe": {
      ctx.fillStyle = "#3a3d46";
      ctx.fillRect(w * 0.12, h * 0.3, 10, h * 0.7);
      ctx.fillRect(w * 0.88 - 10, h * 0.3, 10, h * 0.7);
      stripes(ctx, 0, h * 0.18, w, h * 0.34, "#e8262f", "#ffffff", 22);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.strokeRect(0, h * 0.18, w, h * 0.34);
      for (const x of [w * 0.12, w * 0.88]) {
        glow(ctx, "#ffb000", 18, () => {
          ctx.fillStyle = "#ffcf3d";
          ctx.beginPath();
          ctx.arc(x, h * 0.1, 8, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      break;
    }
    case "turnstile": {
      ctx.fillStyle = lg(ctx, 0, 0, 0, h, ["#c8ccd6", "#6c7180"]);
      rr(ctx, 0, h * 0.1, w * 0.16, h * 0.9, 6);
      ctx.fill();
      rr(ctx, w * 0.84, h * 0.1, w * 0.16, h * 0.9, 6);
      ctx.fill();
      rr(ctx, w * 0.44, h * 0.1, w * 0.12, h * 0.9, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(160,220,255,0.35)";
      rr(ctx, w * 0.16, h * 0.25, w * 0.28, h * 0.4, 8);
      ctx.fill();
      rr(ctx, w * 0.56, h * 0.25, w * 0.28, h * 0.4, 8);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(w * 0.16, h * 0.25, w * 0.28, h * 0.4);
      ctx.strokeRect(w * 0.56, h * 0.25, w * 0.28, h * 0.4);
      for (const x of [w * 0.08, w * 0.5, w * 0.92]) {
        glow(ctx, accent, 10, () => {
          ctx.fillStyle = accent;
          ctx.fillRect(x - 8, h * 0.16, 16, 6);
        });
      }
      break;
    }
    case "cones": {
      ctx.fillStyle = "#222";
      ctx.fillRect(w * 0.08, h * 0.38, w * 0.84, 8);
      stripes(ctx, w * 0.08, h * 0.38, w * 0.84, 8, "#ffcf3d", "#111", 10);
      for (const x of [w * 0.15, w * 0.5, w * 0.85]) {
        ctx.fillStyle = lg(ctx, x - 22, 0, x + 22, 0, ["#ff8a3d", "#ff5a1a", "#b8360a"]);
        ctx.beginPath();
        ctx.moveTo(x - 6, h * 0.05);
        ctx.lineTo(x + 6, h * 0.05);
        ctx.lineTo(x + 24, h * 0.9);
        ctx.lineTo(x - 24, h * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillRect(x - 12, h * 0.42, 24, 8);
        ctx.fillRect(x - 17, h * 0.64, 34, 7);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(x - 30, h * 0.9, 60, h * 0.1);
      }
      break;
    }
    case "planter": {
      ctx.fillStyle = lg(ctx, 0, h * 0.4, 0, h, ["#d6d2c6", "#8a867b"]);
      rr(ctx, 0, h * 0.42, w, h * 0.58, 8);
      ctx.fill();
      for (let i = 0; i < 9; i++) {
        const x = (i + 0.5) * (w / 9);
        ctx.fillStyle = i % 2 ? "#1f8a4c" : "#2fb865";
        ctx.beginPath();
        ctx.arc(x, h * 0.4, 16 + (i % 3) * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      glow(ctx, accent, 12, () => {
        ctx.fillStyle = accent;
        ctx.fillRect(6, h * 0.66, w - 12, 4);
      });
      break;
    }
    case "sandbags": {
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 5 - (row === 2 ? 1 : 0); i++) {
          const x = i * (w / 5) + (row % 2) * (w / 10);
          const y = h - (row + 1) * (h / 3.2);
          ctx.fillStyle = lg(ctx, 0, y, 0, y + h / 3, ["#e9d29a", "#b5975a"]);
          rr(ctx, x + 2, y, w / 5 - 4, h / 3.4, 14);
          ctx.fill();
        }
      }
      glow(ctx, accent, 12, () => {
        ctx.fillStyle = accent;
        ctx.fillRect(4, 4, w - 8, 4);
      });
      break;
    }
  }
  return c;
}

export function paintOverhead(type: OverheadType, accent: string, label: string, accent2 = "#ffffff"): HTMLCanvasElement {
  const top = OVERHEAD_H[type];
  const w = OVERHEAD_W * PX,
    h = top * PX;
  const beamTop = 0;
  const beamH = (top - OVERHEAD_BEAM_BOTTOM) * PX;
  const [c, ctx] = makeCanvas(w, h);
  // posts
  const post = (x: number) => {
    ctx.fillStyle = lg(ctx, x, 0, x + 12, 0, ["#5d6170", "#2a2c35"]);
    ctx.fillRect(x, beamTop, 12, h);
  };
  post(2);
  post(w - 14);
  switch (type) {
    case "gate": {
      ctx.fillStyle = lg(ctx, 0, 0, 0, beamH, ["#20102e", "#0a0510"]);
      rr(ctx, 0, beamH * 0.12, w, beamH * 0.8, 10);
      ctx.fill();
      glow(ctx, accent, 22, () => {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 5;
        rr(ctx, 4, beamH * 0.12 + 4, w - 8, beamH * 0.8 - 8, 8);
        ctx.stroke();
      });
      ctx.fillStyle = shade(accent, -0.3);
      ctx.fillRect(-4, 0, w + 8, 10);
      text(ctx, label, w / 2, beamH * 0.52, beamH * 0.36, "#fff", { glow: accent, maxWidth: w - 28 });
      break;
    }
    case "scaffold": {
      ctx.strokeStyle = "#8a8f9c";
      ctx.lineWidth = 7;
      ctx.strokeRect(6, 6, w - 12, beamH - 8);
      ctx.beginPath();
      ctx.moveTo(6, 6);
      ctx.lineTo(w - 6, beamH - 4);
      ctx.moveTo(w - 6, 6);
      ctx.lineTo(6, beamH - 4);
      ctx.stroke();
      stripes(ctx, 0, beamH - 26, w, 22, "#ffcf3d", "#111", 16);
      glow(ctx, "#ff3b30", 16, () => {
        ctx.fillStyle = "#ff3b30";
        ctx.beginPath();
        ctx.arc(w / 2, beamH - 34, 7, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#fff";
      rr(ctx, w * 0.25, beamH * 0.18, w * 0.5, beamH * 0.34, 4);
      ctx.fill();
      text(ctx, label, w / 2, beamH * 0.35, beamH * 0.17, "#c41e1e", { maxWidth: w * 0.46 });
      break;
    }
    case "gantry": {
      ctx.fillStyle = lg(ctx, 0, 0, 0, beamH, ["#3a3f4d", "#1a1d24"]);
      ctx.fillRect(0, beamH * 0.08, w, beamH * 0.84);
      ctx.fillStyle = "#050608";
      rr(ctx, w * 0.06, beamH * 0.2, w * 0.88, beamH * 0.56, 6);
      ctx.fill();
      text(ctx, label, w / 2, beamH * 0.48, beamH * 0.28, accent, { glow: accent, font: "'Courier New', monospace", maxWidth: w * 0.82 });
      for (let i = 0; i < 6; i++) {
        glow(ctx, accent2, 8, () => {
          ctx.fillStyle = accent2;
          ctx.fillRect(w * 0.1 + i * w * 0.15, beamH * 0.84, w * 0.08, 4);
        });
      }
      break;
    }
    case "banner": {
      ctx.fillStyle = "#1b1b22";
      ctx.fillRect(0, 0, w, 10);
      ctx.fillStyle = lg(ctx, 0, 0, w, 0, [accent, shade(accent, -0.35)]);
      rr(ctx, 8, 12, w - 16, beamH - 18, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(8, beamH - 22, w - 16, 16);
      drawGlyph(ctx, 16, 20, beamH * 0.5, "#ffffff", accent2, 10);
      text(ctx, label, (beamH * 0.5 + 24 + w - 12) / 2, beamH * 0.46, beamH * 0.3, "#ffffff", { maxWidth: w - beamH * 0.5 - 40 });
      break;
    }
    case "awning": {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? accent : accent2;
        ctx.beginPath();
        ctx.moveTo((i * w) / 8, 0);
        ctx.lineTo(((i + 1) * w) / 8, 0);
        ctx.lineTo(((i + 1) * w) / 8, beamH * 0.7);
        ctx.quadraticCurveTo(((i + 0.5) * w) / 8, beamH * 0.92, (i * w) / 8, beamH * 0.7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, w, 8);
      text(ctx, label, w / 2, beamH * 0.36, beamH * 0.24, "#1a1410", { font: "Georgia, serif", weight: "700", maxWidth: w - 16 });
      break;
    }
  }
  return c;
}
