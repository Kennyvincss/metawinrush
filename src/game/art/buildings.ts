// Street-side building facades, one style per city.
import type { CityDef, CityId } from "@/lib/data/cities";
import { drawGlyph } from "@/lib/art/glyph";
import { glow, lg, makeCanvas, poly, rng, rr, shade, text, withAlpha, type C2D } from "./canvas";

export const BLD_PX = 24; // pixels per meter for building textures

export interface BuildingTex {
  canvas: HTMLCanvasElement;
  w: number; // meters
  h: number; // meters
}

type R = () => number;

function windows(ctx: C2D, r: R, x: number, y: number, w: number, h: number, cols: number, rows: number, lit: string[], litP: number, dark = "#0a0b12", ww = 0.6, wh = 0.55) {
  const cw = w / cols,
    ch = h / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const on = r() < litP;
      ctx.fillStyle = on ? lit[Math.floor(r() * lit.length)] : dark;
      ctx.globalAlpha = on ? 0.75 + r() * 0.25 : 1;
      ctx.fillRect(x + i * cw + (cw * (1 - ww)) / 2, y + j * ch + (ch * (1 - wh)) / 2, cw * ww, ch * wh);
    }
  }
  ctx.globalAlpha = 1;
}

function storefront(ctx: C2D, r: R, w: number, h: number, colors: string[], label?: string) {
  const sh = 4.2 * BLD_PX;
  const y = h - sh;
  ctx.fillStyle = "#07070b";
  ctx.fillRect(0, y, w, sh);
  const n = Math.max(1, Math.round(w / (6 * BLD_PX)));
  for (let i = 0; i < n; i++) {
    const c = colors[Math.floor(r() * colors.length)];
    const x = (i * w) / n + 6;
    const sw = w / n - 12;
    ctx.fillStyle = lg(ctx, 0, y + sh * 0.35, 0, h, [withAlpha(c, 0.55), withAlpha(c, 0.12)]);
    ctx.fillRect(x, y + sh * 0.35, sw, sh * 0.65);
    glow(ctx, c, 14, () => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y + sh * 0.12, sw, sh * 0.16);
    });
    if (label && i === 0) text(ctx, label, x + sw / 2, y + sh * 0.2, sh * 0.13, "#0b0b10", { weight: "900" });
  }
}

function metawinSign(ctx: C2D, x: number, y: number, w: number, h: number, c1: string, c2: string) {
  ctx.fillStyle = "#06040c";
  rr(ctx, x, y, w, h, h * 0.15);
  ctx.fill();
  glow(ctx, c1, 18, () => {
    ctx.strokeStyle = c1;
    ctx.lineWidth = 3;
    rr(ctx, x + 3, y + 3, w - 6, h - 6, h * 0.12);
    ctx.stroke();
  });
  drawGlyph(ctx, x + h * 0.12, y + h * 0.12, h * 0.76, "#fff", c1, 14);
  text(ctx, "METAWIN", x + h + (w - h) / 2, y + h / 2, Math.min(h * 0.42, (w - h) / 5.5), "#fff", { glow: c2 });
}

function tokyo(ctx: C2D, r: R, w: number, h: number, p: CityDef["palette"]) {
  ctx.fillStyle = lg(ctx, 0, 0, w, 0, ["#1d1530", "#140e22", "#0c0816"]);
  ctx.fillRect(0, 0, w, h);
  windows(ctx, r, 8, 30, w - 16, h - 160, Math.round(w / 22), Math.round(h / 26), p.windowLit, 0.45);
  // vertical katakana sign
  const sx = r() < 0.5 ? 10 : w - 52;
  const signs = ["ラッシュ", "メタウィン", "ネオン", "東京", "ゲーム"];
  const s = signs[Math.floor(r() * signs.length)];
  const c = p.neon[Math.floor(r() * p.neon.length)];
  ctx.fillStyle = "#0a0410";
  rr(ctx, sx, 40, 42, s.length * 40 + 20, 6);
  ctx.fill();
  glow(ctx, c, 16, () => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    rr(ctx, sx + 2, 42, 38, s.length * 40 + 16, 5);
    ctx.stroke();
  });
  text(ctx, s, sx + 21, 68, 32, "#fff", { glow: c, vertical: true });
  // billboard screen
  if (r() < 0.6) {
    const bw = w * 0.6,
      bh = bw * 0.55,
      bx = (w - bw) / 2,
      by = h * 0.35;
    ctx.fillStyle = lg(ctx, bx, by, bx + bw, by + bh, [p.neon[0], p.neon[2], p.neon[1]]);
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let y = by; y < by + bh; y += 4) ctx.fillRect(bx, y, bw, 1);
    if (r() < 0.6) metawinSign(ctx, bx + 8, by + bh * 0.3, bw - 16, bh * 0.4, p.neon[1], p.neon[0]);
    else text(ctx, "東京ラッシュ", bx + bw / 2, by + bh / 2, bh * 0.25, "#fff", { glow: "#fff" });
  }
  storefront(ctx, r, w, h, p.neon);
  // rooftop rim light
  glow(ctx, c, 12, () => {
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, w, 4);
  });
}

function newyork(ctx: C2D, r: R, w: number, h: number, p: CityDef["palette"]) {
  const brick = r() < 0.5;
  ctx.fillStyle = brick ? lg(ctx, 0, 0, w, 0, ["#4a2a22", "#3a1f19", "#2a1511"]) : lg(ctx, 0, 0, w, 0, ["#6b6a6e", "#4c4b50", "#333237"]);
  ctx.fillRect(0, 0, w, h);
  // cornice
  ctx.fillStyle = shade(brick ? "#4a2a22" : "#6b6a6e", 0.2);
  ctx.fillRect(0, 0, w, 14);
  windows(ctx, r, 10, 30, w - 20, h - 150, Math.round(w / 28), Math.round(h / 34), p.windowLit, 0.55, "#11131a", 0.55, 0.6);
  // fire escape
  if (brick) {
    ctx.strokeStyle = "#141414";
    ctx.lineWidth = 3;
    for (let y = 60; y < h - 140; y += 80) {
      ctx.strokeRect(w * 0.3, y, w * 0.4, 30);
      ctx.beginPath();
      ctx.moveTo(w * 0.3, y + 30);
      ctx.lineTo(w * 0.7, y + 80);
      ctx.stroke();
    }
  }
  // Times Square style screen
  if (r() < 0.65) {
    const bw = w * 0.84,
      bh = Math.min(h * 0.22, bw * 0.6),
      bx = (w - bw) / 2,
      by = h * 0.5 - bh;
    ctx.fillStyle = "#050505";
    ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    const pick = r();
    if (pick < 0.4) metawinSign(ctx, bx, by, bw, bh, "#b44dff", "#59f3ff");
    else {
      ctx.fillStyle = lg(ctx, bx, by, bx + bw, by + bh, pick < 0.7 ? ["#ff4d4d", "#ffd23f"] : ["#2f6bff", "#4dd2ff"]);
      ctx.fillRect(bx, by, bw, bh);
      text(ctx, pick < 0.7 ? "RUSH 24/7" : "NYC LIVE", bx + bw / 2, by + bh / 2, bh * 0.3, "#fff", { glow: "#fff" });
    }
  }
  storefront(ctx, r, w, h, ["#ffd23f", "#ff4d4d", "#4dd2ff"], r() < 0.4 ? "DELI" : undefined);
  // water tower on roof is drawn as a separate prop silhouette in the skyline
}

function dubai(ctx: C2D, r: R, w: number, h: number, p: CityDef["palette"]) {
  ctx.fillStyle = lg(ctx, 0, 0, w, h, ["#1e3550", "#0f1e33", "#0a1220"]);
  ctx.fillRect(0, 0, w, h);
  // glass curtain wall with diagonal reflections
  ctx.strokeStyle = "rgba(255,207,110,0.35)";
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 22) {
    ctx.fillStyle = r() < 0.5 ? "rgba(255,226,166,0.18)" : "rgba(189,246,255,0.08)";
    ctx.fillRect(0, y, w, 12);
  }
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  poly(ctx, [
    [0, h * 0.2],
    [w, 0],
    [w, h * 0.12],
    [0, h * 0.34],
  ]);
  ctx.fill();
  // gold LED edges
  glow(ctx, "#ffcf6e", 16, () => {
    ctx.fillStyle = "#ffcf6e";
    ctx.fillRect(0, 0, 4, h);
    ctx.fillRect(w - 4, 0, 4, h);
    ctx.fillRect(0, 0, w, 4);
  });
  // mashrabiya-style geometric panel
  if (r() < 0.6) {
    const py = h * 0.3,
      ph = h * 0.25;
    ctx.strokeStyle = "rgba(255,207,110,0.5)";
    ctx.lineWidth = 1.5;
    for (let y = py; y < py + ph; y += 20)
      for (let x = 10; x < w - 10; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x + 10, y);
        ctx.lineTo(x + 20, y + 10);
        ctx.lineTo(x + 10, y + 20);
        ctx.lineTo(x, y + 10);
        ctx.closePath();
        ctx.stroke();
      }
  }
  if (r() < 0.4) metawinSign(ctx, w * 0.1, h * 0.12, w * 0.8, w * 0.2, "#ffcf6e", "#59f3ff");
  storefront(ctx, r, w, h, ["#ffcf6e", "#59f3ff", "#ffffff"]);
}

function london(ctx: C2D, r: R, w: number, h: number, p: CityDef["palette"]) {
  const modern = r() < 0.3;
  if (modern) {
    ctx.fillStyle = lg(ctx, 0, 0, w, 0, ["#2c3a52", "#1c2638"]);
    ctx.fillRect(0, 0, w, h);
    windows(ctx, r, 6, 10, w - 12, h - 130, Math.round(w / 16), Math.round(h / 18), ["#dfe8ff", "#ffe6b0"], 0.5, "#141a26", 0.85, 0.7);
  } else {
    // Victorian terrace: brick, white sash windows, chimneys
    ctx.fillStyle = lg(ctx, 0, 0, w, 0, ["#6a3a2a", "#552d20", "#41221a"]);
    ctx.fillRect(0, 14, w, h - 14);
    ctx.fillStyle = "#2a2a30";
    ctx.fillRect(0, 0, w, 16); // roof line
    for (const x of [w * 0.2, w * 0.7]) {
      ctx.fillStyle = "#4a2a20";
      ctx.fillRect(x, -0, 26, 20);
    }
    const cols = Math.max(2, Math.round(w / 40)),
      rows = Math.max(2, Math.round((h - 130) / 70));
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const cw = (w - 20) / cols;
        const x = 10 + i * cw + cw * 0.22,
          y = 40 + j * 70;
        ctx.fillStyle = "#f2efe6";
        ctx.fillRect(x - 4, y - 4, cw * 0.56 + 8, 52);
        ctx.fillStyle = r() < 0.55 ? p.windowLit[Math.floor(r() * p.windowLit.length)] : "#151821";
        ctx.fillRect(x, y, cw * 0.56, 44);
        ctx.fillStyle = "#f2efe6";
        ctx.fillRect(x, y + 20, cw * 0.56, 3);
        ctx.fillRect(x + cw * 0.27, y, 3, 44);
      }
  }
  storefront(ctx, r, w, h, ["#e3262f", "#2f6bff", "#ffe6b0"], r() < 0.5 ? "PUB" : undefined);
  if (r() < 0.35) {
    // Underground roundel
    const cx = w / 2,
      cy = h - 6.2 * BLD_PX,
      rad = 36;
    ctx.lineWidth = 14;
    glow(ctx, "#e3262f", 10, () => {
      ctx.strokeStyle = "#e3262f";
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = "#1f3a9e";
    ctx.fillRect(cx - rad - 20, cy - 12, rad * 2 + 40, 24);
    text(ctx, "UNDERGROUND", cx, cy, 13, "#fff");
  }
}

function lagos(ctx: C2D, r: R, w: number, h: number, p: CityDef["palette"]) {
  const tower = h > 40 * BLD_PX;
  if (tower) {
    ctx.fillStyle = lg(ctx, 0, 0, w, 0, ["#1f3b4a", "#132630"]);
    ctx.fillRect(0, 0, w, h);
    windows(ctx, r, 6, 10, w - 12, h - 130, Math.round(w / 16), Math.round(h / 20), p.windowLit, 0.5, "#0d1a20", 0.85, 0.65);
  } else {
    const paints = ["#e8a33d", "#2fa58f", "#d9583b", "#e6d36a", "#5b8fd6", "#f2efe6"];
    const base = paints[Math.floor(r() * paints.length)];
    ctx.fillStyle = lg(ctx, 0, 0, 0, h, [shade(base, -0.35), shade(base, -0.6)]);
    ctx.fillRect(0, 10, w, h - 10);
    // balconies with railings
    const rows = Math.max(2, Math.round((h - 130) / 72));
    for (let j = 0; j < rows; j++) {
      const y = 30 + j * 72;
      windows(ctx, r, 10, y, w - 20, 44, Math.max(2, Math.round(w / 34)), 1, p.windowLit, 0.6, "#151515", 0.6, 0.8);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, y + 46, w, 8);
      ctx.strokeStyle = "#202020";
      ctx.lineWidth = 2;
      for (let x = 4; x < w; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, y + 46);
        ctx.lineTo(x, y + 30);
        ctx.stroke();
      }
    }
    // rooftop water tank
    ctx.fillStyle = "#1a1a1a";
    rr(ctx, w * 0.6, 0, 40, 26, 6);
    ctx.fill();
  }
  // big billboard
  if (r() < 0.75) {
    const bw = w * 0.86,
      bh = bw * 0.42,
      bx = (w - bw) / 2,
      by = h * (tower ? 0.42 : 0.18);
    ctx.fillStyle = "#111";
    ctx.fillRect(bx - 5, by - 5, bw + 10, bh + 10);
    const pick = r();
    if (pick < 0.5) metawinSign(ctx, bx, by, bw, bh, "#13d36f", "#ffdd00");
    else {
      ctx.fillStyle = lg(ctx, bx, by, bx + bw, by, ["#13a35a", "#0e6b3b"]);
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = "#fff";
      ctx.fillRect(bx + bw * 0.34, by, bw * 0.32, bh);
      text(ctx, pick < 0.75 ? "EKO RUSH" : "NAIJA NO DEY CARRY LAST", bx + bw / 2, by + bh / 2, Math.min(bh * 0.28, bw / 12), pick < 0.75 ? "#0b0b0b" : "#ffdd00", { glow: pick < 0.75 ? undefined : "#000" });
    }
  }
  storefront(ctx, r, w, h, ["#13d36f", "#ffdd00", "#ff7a1a"], r() < 0.4 ? "SUYA SPOT" : r() < 0.5 ? "MAMA PUT" : undefined);
}

function paris(ctx: C2D, r: R, w: number, h: number, p: CityDef["palette"]) {
  // Haussmann: cream stone, mansard roof, iron balconies
  const roofH = 4 * BLD_PX;
  ctx.fillStyle = lg(ctx, 0, 0, w, 0, ["#cdbf9f", "#b3a585", "#958868"]);
  ctx.fillRect(0, roofH, w, h - roofH);
  ctx.fillStyle = lg(ctx, 0, 0, 0, roofH, ["#5d6878", "#3a4250"]);
  poly(ctx, [
    [10, 0],
    [w - 10, 0],
    [w, roofH],
    [0, roofH],
  ]);
  ctx.fill();
  // dormers
  for (let x = 20; x < w - 30; x += 50) {
    ctx.fillStyle = "#e7dcc0";
    ctx.fillRect(x, roofH * 0.3, 24, roofH * 0.6);
    ctx.fillStyle = r() < 0.5 ? "#ffdca0" : "#2a2a33";
    ctx.fillRect(x + 4, roofH * 0.38, 16, roofH * 0.45);
  }
  const cols = Math.max(2, Math.round(w / 42)),
    rows = Math.max(2, Math.round((h - roofH - 130) / 74));
  for (let j = 0; j < rows; j++) {
    const y = roofH + 16 + j * 74;
    for (let i = 0; i < cols; i++) {
      const cw = (w - 16) / cols;
      const x = 8 + i * cw + cw * 0.18;
      const ww = cw * 0.64;
      ctx.fillStyle = r() < 0.6 ? p.windowLit[Math.floor(r() * p.windowLit.length)] : "#1d1b24";
      rr(ctx, x, y, ww, 50, [10, 10, 0, 0]);
      ctx.fill();
      ctx.strokeStyle = "#f4ead2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + ww / 2, y);
      ctx.lineTo(x + ww / 2, y + 50);
      ctx.stroke();
    }
    // wrought-iron balcony
    if (j % 2 === 0 || j === rows - 1) {
      ctx.strokeStyle = "#141418";
      ctx.lineWidth = 2;
      ctx.strokeRect(4, y + 40, w - 8, 14);
      for (let x = 8; x < w - 8; x += 8) {
        ctx.beginPath();
        ctx.arc(x, y + 47, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  // café awning at street level
  const sh = 4.2 * BLD_PX;
  ctx.fillStyle = "#0b0a0e";
  ctx.fillRect(0, h - sh, w, sh);
  ctx.fillStyle = lg(ctx, 0, h - sh * 0.6, 0, h, ["rgba(255,210,140,0.65)", "rgba(255,170,90,0.2)"]);
  ctx.fillRect(6, h - sh * 0.6, w - 12, sh * 0.6);
  const aw = r() < 0.5 ? "#a3192d" : "#1f5a3a";
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? aw : "#f2ead8";
    ctx.fillRect((i * w) / 12, h - sh, w / 12 + 1, sh * 0.32);
  }
  text(ctx, r() < 0.5 ? "CAFÉ METAWIN" : "BRASSERIE", w / 2, h - sh * 0.82, sh * 0.13, "#fff8e8", { font: "Georgia, serif" });
}

function seoul(ctx: C2D, r: R, w: number, h: number, p: CityDef["palette"]) {
  ctx.fillStyle = lg(ctx, 0, 0, w, 0, ["#0d1830", "#081022"]);
  ctx.fillRect(0, 0, w, h);
  windows(ctx, r, 6, 10, w - 12, h - 130, Math.round(w / 14), Math.round(h / 16), p.windowLit, 0.35, "#0a1224", 0.8, 0.6);
  // huge LED screen
  const bw = w * 0.9,
    bh = Math.min(h * 0.4, bw * 1.2),
    bx = (w - bw) / 2,
    by = h * 0.18;
  const pal = [p.neon[Math.floor(r() * 4)], p.neon[Math.floor(r() * 4)], p.neon[Math.floor(r() * 4)]];
  ctx.fillStyle = lg(ctx, bx, by, bx + bw, by + bh, pal);
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  for (let y = by; y < by + bh; y += 3) ctx.fillRect(bx, y, bw, 1);
  const pick = r();
  if (pick < 0.35) metawinSign(ctx, bx + 6, by + bh * 0.38, bw - 12, bh * 0.24, "#59f3ff", "#ff3d7f");
  else text(ctx, ["서울 러시", "메타윈", "달려라!", "강남"][Math.floor(r() * 4)], bx + bw / 2, by + bh / 2, Math.min(bh * 0.2, bw / 4.2), "#fff", { glow: "#fff" });
  glow(ctx, p.neon[0], 14, () => {
    ctx.strokeStyle = p.neon[0];
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);
  });
  storefront(ctx, r, w, h, p.neon, r() < 0.4 ? "편의점" : undefined);
}

function singapore(ctx: C2D, r: R, w: number, h: number, p: CityDef["palette"]) {
  ctx.fillStyle = lg(ctx, 0, 0, w, 0, ["#e8efe9", "#c3d1cb", "#9db0a8"]);
  ctx.fillRect(0, 0, w, h);
  // glass bands
  const rows = Math.round((h - 130) / 40);
  for (let j = 0; j < rows; j++) {
    const y = 20 + j * 40;
    ctx.fillStyle = lg(ctx, 0, y, 0, y + 26, ["#1d3b3f", "#0b1c1f"]);
    ctx.fillRect(6, y, w - 12, 26);
    for (let x = 6; x < w - 12; x += 16) if (r() < 0.55) {
      ctx.fillStyle = p.windowLit[Math.floor(r() * p.windowLit.length)];
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x + 2, y + 4, 12, 18);
      ctx.globalAlpha = 1;
    }
    // sky gardens
    if (j % 3 === 1) {
      for (let x = 0; x < w; x += 14) {
        ctx.fillStyle = r() < 0.5 ? "#2fb865" : "#1f8a4c";
        ctx.beginPath();
        ctx.arc(x + 7, y + 30, 8 + r() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  glow(ctx, "#7dffb2", 14, () => {
    ctx.fillStyle = "#7dffb2";
    ctx.fillRect(0, 0, w, 4);
  });
  if (r() < 0.35) metawinSign(ctx, w * 0.08, h * 0.08, w * 0.84, w * 0.2, "#7dffb2", "#ff5ad8");
  storefront(ctx, r, w, h, ["#7dffb2", "#ff5ad8", "#fff2b8"], r() < 0.4 ? "HAWKER" : undefined);
}

const PAINTERS: Record<CityId, (ctx: C2D, r: R, w: number, h: number, p: CityDef["palette"]) => void> = {
  tokyo,
  newyork,
  dubai,
  london,
  lagos,
  paris,
  seoul,
  singapore,
};

const SIZE_RANGES: Record<CityId, { w: [number, number]; h: [number, number] }> = {
  tokyo: { w: [9, 14], h: [26, 48] },
  newyork: { w: [12, 20], h: [34, 70] },
  dubai: { w: [14, 22], h: [40, 80] },
  london: { w: [10, 16], h: [16, 26] },
  lagos: { w: [10, 16], h: [14, 48] },
  paris: { w: [12, 18], h: [20, 26] },
  seoul: { w: [12, 18], h: [30, 60] },
  singapore: { w: [14, 20], h: [36, 70] },
};

export function paintBuildings(city: CityDef, count: number): BuildingTex[] {
  const out: BuildingTex[] = [];
  const range = SIZE_RANGES[city.id];
  for (let i = 0; i < count; i++) {
    const r = rng(1000 + i * 7919 + city.id.length * 131);
    const wM = range.w[0] + (range.w[1] - range.w[0]) * r();
    const hM = range.h[0] + (range.h[1] - range.h[0]) * (i / Math.max(1, count - 1)) * (0.7 + 0.3 * r());
    const hPx = Math.min(2040, hM * BLD_PX);
    const [c, ctx] = makeCanvas(wM * BLD_PX, hPx);
    PAINTERS[city.id](ctx, r, c.width, c.height, city.palette);
    // fog toward the top for atmospheric depth
    ctx.fillStyle = lg(ctx, 0, 0, 0, c.height * 0.5, [withAlpha(city.palette.fog, 0.55), withAlpha(city.palette.fog, 0)]);
    ctx.fillRect(0, 0, c.width, c.height * 0.5);
    out.push({ canvas: c, w: c.width / BLD_PX, h: c.height / BLD_PX });
  }
  return out;
}
