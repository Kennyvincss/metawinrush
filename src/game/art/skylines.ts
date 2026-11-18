// Sky and distant skyline layers with each city's landmark silhouettes (original, "inspired-by" designs).
import type { CityDef, CityId } from "@/lib/data/cities";
import { drawGlyph } from "@/lib/art/glyph";
import { glow, lg, makeCanvas, poly, rg, rng, rr, shade, text, withAlpha, type C2D } from "./canvas";

export const SKY_W = 2048;
export const FAR_H = 760;
export const NEAR_H = 420;

type R = () => number;

export function paintSky(city: CityDef): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(1024, 1024);
  const p = city.palette;
  ctx.fillStyle = lg(ctx, 0, 0, 0, 1024, [p.skyTop, [0.55, p.skyMid], [0.9, p.skyBottom], [1, p.horizonGlow]]);
  ctx.fillRect(0, 0, 1024, 1024);
  const r = rng(city.id.length * 999);
  for (let i = 0; i < 260; i++) {
    const y = r() * 700;
    ctx.fillStyle = `rgba(255,255,255,${(0.15 + r() * 0.7) * (1 - y / 760)})`;
    const s = r() < 0.08 ? 2.4 : 1.2;
    ctx.fillRect(r() * 1024, y, s, s);
  }
  // moon
  const mx = 220 + r() * 600;
  ctx.fillStyle = rg(ctx, mx, 220, 10, 140, [withAlpha(p.horizonGlow, 0.35), withAlpha(p.horizonGlow, 0)]);
  ctx.fillRect(mx - 140, 80, 280, 280);
  glow(ctx, "#ffffff", 30, () => {
    ctx.fillStyle = "#f4f0ff";
    ctx.beginPath();
    ctx.arc(mx, 220, 34, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.arc(mx - 10, 212, 10, 0, Math.PI * 2);
  ctx.arc(mx + 12, 232, 6, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function towers(ctx: C2D, r: R, y0: number, minH: number, maxH: number, color: string, lit: string[], density = 1, litP = 0.35) {
  let x = -20;
  while (x < SKY_W) {
    const w = 40 + r() * 90;
    const h = minH + r() * (maxH - minH);
    ctx.fillStyle = color;
    ctx.fillRect(x, y0 - h, w, h);
    if (r() < 0.25) ctx.fillRect(x + w * 0.4, y0 - h - 30, 4, 30); // antenna
    for (let yy = y0 - h + 8; yy < y0 - 6; yy += 9)
      for (let xx = x + 5; xx < x + w - 5; xx += 8)
        if (r() < litP) {
          ctx.fillStyle = withAlpha(lit[Math.floor(r() * lit.length)], 0.55 + r() * 0.4);
          ctx.fillRect(xx, yy, 3, 4);
        }
    x += w * (0.7 + r() * 0.5) / density;
  }
}

function lattice(ctx: C2D, cx: number, base: number, h: number, w: number, color: string, light?: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const steps = 18;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps,
      t1 = (i + 1) / steps;
    const w0 = w * Math.pow(1 - t0, 1.6) + 4,
      w1 = w * Math.pow(1 - t1, 1.6) + 4;
    const y0 = base - h * t0,
      y1 = base - h * t1;
    ctx.beginPath();
    ctx.moveTo(cx - w0 / 2, y0);
    ctx.lineTo(cx - w1 / 2, y1);
    ctx.moveTo(cx + w0 / 2, y0);
    ctx.lineTo(cx + w1 / 2, y1);
    ctx.moveTo(cx - w0 / 2, y0);
    ctx.lineTo(cx + w1 / 2, y1);
    ctx.moveTo(cx + w0 / 2, y0);
    ctx.lineTo(cx - w1 / 2, y1);
    ctx.moveTo(cx - w1 / 2, y1);
    ctx.lineTo(cx + w1 / 2, y1);
    ctx.stroke();
  }
  if (light) {
    glow(ctx, light, 20, () => {
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(cx, base - h, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function wheel(ctx: C2D, cx: number, cy: number, rad: number, color: string, lights: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    ctx.lineWidth = 1;
    ctx.stroke();
    glow(ctx, lights, 8, () => {
      ctx.fillStyle = lights;
      ctx.fillRect(cx + Math.cos(a) * rad - 3, cy + Math.sin(a) * rad - 3, 6, 6);
    });
  }
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.5, cy + rad * 1.15);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + rad * 0.5, cy + rad * 1.15);
  ctx.stroke();
}

function landmarks(id: CityId, ctx: C2D, r: R, p: CityDef["palette"]) {
  const B = FAR_H; // baseline
  const sil = shade(p.skyMid, -0.35);
  switch (id) {
    case "tokyo": {
      // distant mountain
      ctx.fillStyle = withAlpha("#2a1446", 0.9);
      poly(ctx, [
        [1250, B],
        [1520, B - 300],
        [1580, B - 310],
        [1850, B],
      ]);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      poly(ctx, [
        [1480, B - 260],
        [1520, B - 300],
        [1580, B - 310],
        [1620, B - 262],
        [1585, B - 272],
        [1550, B - 255],
        [1515, B - 270],
      ]);
      ctx.fill();
      lattice(ctx, 640, B, 560, 120, "#ff5a3d", "#ffffff");
      glow(ctx, "#ff8a3d", 16, () => {
        ctx.fillStyle = "#ff8a3d";
        ctx.fillRect(612, B - 300, 56, 14);
        ctx.fillRect(624, B - 430, 32, 10);
      });
      break;
    }
    case "newyork": {
      // stepped art-deco spire
      ctx.fillStyle = sil;
      const cx = 700;
      [
        [160, 300],
        [110, 420],
        [70, 500],
        [40, 560],
        [16, 620],
        [4, 700],
      ].forEach(([w, h]) => ctx.fillRect(cx - w / 2, B - h, w, h));
      glow(ctx, "#ffb347", 18, () => {
        ctx.fillStyle = "#ffd98a";
        for (let i = 0; i < 6; i++) ctx.fillRect(cx - 30 + i * 2, B - 560 + i * 12, 60 - i * 4, 3);
      });
      // crown tower
      const c2 = 1180;
      ctx.fillStyle = sil;
      ctx.fillRect(c2 - 50, B - 470, 100, 470);
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(c2, B - 470 - i * 18, 50 - i * 8, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillRect(c2 - 2, B - 640, 4, 110);
      glow(ctx, "#e8ecf5", 12, () => {
        ctx.strokeStyle = "#e8ecf5";
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(c2, B - 470 - i * 18, 44 - i * 8, Math.PI, 0);
          ctx.stroke();
        }
      });
      // tapered glass tower
      ctx.fillStyle = shade(p.skyMid, -0.2);
      poly(ctx, [
        [1560, B],
        [1680, B],
        [1650, B - 640],
        [1590, B - 640],
      ]);
      ctx.fill();
      ctx.fillRect(1618, B - 740, 4, 100);
      break;
    }
    case "dubai": {
      // dunes
      ctx.fillStyle = "#3a2418";
      ctx.beginPath();
      ctx.moveTo(0, B);
      for (let x = 0; x <= SKY_W; x += 64) ctx.lineTo(x, B - 40 - Math.sin(x / 180) * 26 - Math.sin(x / 67) * 8);
      ctx.lineTo(SKY_W, B);
      ctx.fill();
      // supertall stepped spire
      const cx = 1000;
      ctx.fillStyle = sil;
      const tiers = 9;
      for (let i = 0; i < tiers; i++) {
        const w = 130 * (1 - i / tiers) + 10;
        ctx.fillRect(cx - w / 2 + (i % 2 ? 8 : -8), B - (i + 1) * 70, w, 70 + 2);
      }
      poly(ctx, [
        [cx - 6, B - tiers * 70],
        [cx + 6, B - tiers * 70],
        [cx, B - tiers * 70 - 120],
      ]);
      ctx.fill();
      glow(ctx, "#ffcf6e", 16, () => {
        ctx.strokeStyle = "#ffcf6e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, B);
        ctx.lineTo(cx, B - tiers * 70 - 110);
        ctx.stroke();
      });
      // sail hotel
      ctx.fillStyle = shade(p.skyMid, -0.15);
      ctx.beginPath();
      ctx.moveTo(1500, B);
      ctx.quadraticCurveTo(1520, B - 300, 1640, B - 380);
      ctx.lineTo(1650, B);
      ctx.closePath();
      ctx.fill();
      glow(ctx, "#59f3ff", 14, () => {
        ctx.strokeStyle = "#59f3ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(1510, B);
        ctx.quadraticCurveTo(1528, B - 290, 1640, B - 376);
        ctx.stroke();
      });
      break;
    }
    case "london": {
      // clock tower
      const cx = 620;
      ctx.fillStyle = sil;
      ctx.fillRect(cx - 34, B - 420, 68, 420);
      ctx.fillRect(cx - 40, B - 470, 80, 60);
      poly(ctx, [
        [cx - 40, B - 470],
        [cx + 40, B - 470],
        [cx, B - 600],
      ]);
      ctx.fill();
      glow(ctx, "#ffe6a0", 22, () => {
        ctx.fillStyle = "#ffe6a0";
        ctx.beginPath();
        ctx.arc(cx, B - 440, 24, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, B - 440);
      ctx.lineTo(cx, B - 458);
      ctx.moveTo(cx, B - 440);
      ctx.lineTo(cx + 12, B - 436);
      ctx.stroke();
      // parliament gothic row
      ctx.fillStyle = sil;
      ctx.fillRect(cx + 34, B - 160, 600, 160);
      for (let x = cx + 50; x < cx + 630; x += 40) {
        poly(ctx, [
          [x - 6, B - 160],
          [x + 6, B - 160],
          [x, B - 200],
        ]);
        ctx.fill();
      }
      // wheel + shard
      wheel(ctx, 1450, B - 220, 180, withAlpha("#bcd2ff", 0.7), "#59f3ff");
      ctx.fillStyle = shade(p.skyMid, -0.1);
      poly(ctx, [
        [1720, B],
        [1880, B],
        [1810, B - 640],
      ]);
      ctx.fill();
      break;
    }
    case "lagos": {
      // lagoon water band
      ctx.fillStyle = lg(ctx, 0, B - 90, 0, B, ["#0d2a3a", "#06141c"]);
      ctx.fillRect(0, B - 90, SKY_W, 90);
      // island skyline
      towers(ctx, r, B - 80, 80, 300, sil, p.windowLit, 1.5, 0.3);
      // long low bridge across the lagoon
      ctx.fillStyle = "#1a1f26";
      ctx.fillRect(0, B - 70, SKY_W, 10);
      for (let x = 0; x < SKY_W; x += 48) ctx.fillRect(x, B - 62, 6, 62);
      for (let x = 0; x < SKY_W; x += 24) {
        glow(ctx, "#ffb02e", 10, () => {
          ctx.fillStyle = "#ffcf7a";
          ctx.fillRect(x, B - 76, 3, 4);
        });
      }
      // reflections
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = withAlpha(p.windowLit[i % 3], 0.25);
        ctx.fillRect(r() * SKY_W, B - 50 + r() * 50, 10 + r() * 30, 2);
      }
      // palms
      for (let i = 0; i < 9; i++) palm(ctx, 120 + i * 230 + r() * 60, B - 70, 120 + r() * 60, "#05100a");
      break;
    }
    case "paris": {
      const cx = 1000;
      lattice(ctx, cx, B, 640, 280, "#b9935a");
      ctx.fillStyle = "#b9935a";
      ctx.fillRect(cx - 96, B - 210, 192, 10);
      ctx.fillRect(cx - 50, B - 380, 100, 8);
      // sparkle
      for (let i = 0; i < 60; i++) {
        const t = r();
        const y = B - t * 620;
        const w = 140 * Math.pow(1 - t, 1.6);
        glow(ctx, "#fff6d8", 8, () => {
          ctx.fillStyle = "#fff6d8";
          ctx.fillRect(cx + (r() - 0.5) * w, y, 2.5, 2.5);
        });
      }
      glow(ctx, "#ffd98a", 30, () => {
        ctx.fillStyle = "#ffd98a";
        ctx.beginPath();
        ctx.arc(cx, B - 640, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      // arch
      ctx.fillStyle = sil;
      ctx.fillRect(1500, B - 220, 220, 220);
      ctx.fillStyle = shade(p.skyBottom, -0.1);
      ctx.beginPath();
      ctx.arc(1610, B - 80, 50, Math.PI, 0);
      ctx.fillRect(1560, B - 80, 100, 80);
      ctx.fill();
      break;
    }
    case "seoul": {
      // mountains
      ctx.fillStyle = "#06142a";
      ctx.beginPath();
      ctx.moveTo(0, B);
      for (let x = 0; x <= SKY_W; x += 32) ctx.lineTo(x, B - 120 - Math.sin(x / 260) * 90 - Math.sin(x / 90) * 20);
      ctx.lineTo(SKY_W, B);
      ctx.fill();
      // tower on the hill
      const cx = 560;
      ctx.fillStyle = sil;
      ctx.fillRect(cx - 8, B - 520, 16, 330);
      ctx.beginPath();
      ctx.ellipse(cx, B - 470, 36, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 2, B - 640, 4, 130);
      glow(ctx, "#59f3ff", 18, () => {
        ctx.fillStyle = "#59f3ff";
        ctx.fillRect(cx - 34, B - 474, 68, 4);
      });
      // tapered supertall
      ctx.fillStyle = shade(p.skyMid, -0.25);
      ctx.beginPath();
      ctx.moveTo(1300, B);
      ctx.quadraticCurveTo(1310, B - 400, 1370, B - 700);
      ctx.quadraticCurveTo(1430, B - 400, 1440, B);
      ctx.fill();
      glow(ctx, "#ff3d7f", 14, () => {
        ctx.strokeStyle = "#ff3d7f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(1370, B - 700);
        ctx.lineTo(1370, B);
        ctx.stroke();
      });
      break;
    }
    case "singapore": {
      // three towers with a sky boat
      const xs = [880, 1010, 1140];
      ctx.fillStyle = sil;
      for (const x of xs) {
        poly(ctx, [
          [x - 40, B],
          [x + 40, B],
          [x + 34, B - 420],
          [x - 34, B - 420],
        ]);
        ctx.fill();
      }
      ctx.fillStyle = shade(p.skyMid, -0.15);
      ctx.beginPath();
      ctx.moveTo(800, B - 430);
      ctx.lineTo(1230, B - 440);
      ctx.quadraticCurveTo(1240, B - 410, 1200, B - 418);
      ctx.lineTo(820, B - 412);
      ctx.closePath();
      ctx.fill();
      glow(ctx, "#7dffb2", 14, () => {
        ctx.fillStyle = "#7dffb2";
        ctx.fillRect(810, B - 432, 410, 3);
      });
      // supertrees
      for (let i = 0; i < 6; i++) supertree(ctx, 200 + i * 90 + (i % 2) * 30, B, 160 + (i % 3) * 70, i % 2 ? "#ff5ad8" : "#7dffb2");
      wheel(ctx, 1600, B - 200, 160, withAlpha("#d8fff0", 0.6), "#ff5ad8");
      break;
    }
  }
}

export function palm(ctx: C2D, x: number, base: number, h: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, h * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + h * 0.15, base - h * 0.5, x + h * 0.05, base - h);
  ctx.stroke();
  ctx.fillStyle = color;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.45;
    const tx = x + h * 0.05 + Math.cos(a) * h * 0.45,
      ty = base - h + Math.sin(a) * h * 0.25 + h * 0.12;
    ctx.beginPath();
    ctx.moveTo(x + h * 0.05, base - h);
    ctx.quadraticCurveTo((x + tx) / 2, ty - h * 0.15, tx, ty);
    ctx.quadraticCurveTo((x + tx) / 2, ty - h * 0.05, x + h * 0.05, base - h + 4);
    ctx.fill();
  }
}

export function supertree(ctx: C2D, x: number, base: number, h: number, light: string) {
  ctx.fillStyle = "#0a1f1a";
  poly(ctx, [
    [x - 8, base],
    [x + 8, base],
    [x + 4, base - h * 0.7],
    [x - 4, base - h * 0.7],
  ]);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 4, base - h * 0.7);
  ctx.lineTo(x - h * 0.3, base - h);
  ctx.lineTo(x + h * 0.3, base - h);
  ctx.lineTo(x + 4, base - h * 0.7);
  ctx.closePath();
  ctx.fill();
  glow(ctx, light, 16, () => {
    ctx.strokeStyle = light;
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, base - h * 0.7);
      ctx.lineTo(x + i * h * 0.1, base - h);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(x, base - h, h * 0.3, h * 0.04, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

export function paintSkylineFar(city: CityDef): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(SKY_W, FAR_H);
  const r = rng(city.id.length * 31 + 7);
  const p = city.palette;
  // horizon haze
  ctx.fillStyle = lg(ctx, 0, FAR_H - 300, 0, FAR_H, [withAlpha(p.horizonGlow, 0), withAlpha(p.horizonGlow, 0.35)]);
  ctx.fillRect(0, FAR_H - 300, SKY_W, 300);
  if (city.id !== "lagos") towers(ctx, r, FAR_H, 60, city.id === "london" || city.id === "paris" ? 140 : 260, shade(p.skyMid, -0.15), p.windowLit, 1.4, 0.2);
  landmarks(city.id, ctx, r, p);
  // Metawin hologram somewhere in the sky
  ctx.globalAlpha = 0.18;
  drawGlyph(ctx, 1700 - (city.id.length * 37) % 600, 120, 160, p.neon[0], p.neon[0], 30);
  ctx.globalAlpha = 1;
  return c;
}

export function paintSkylineNear(city: CityDef): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(SKY_W, NEAR_H);
  const r = rng(city.id.length * 77 + 3);
  const p = city.palette;
  const low = city.id === "london" || city.id === "paris";
  towers(ctx, r, NEAR_H, low ? 50 : 90, low ? 170 : 380, shade(p.skyTop, 0.04), p.windowLit, 1.1, 0.42);
  if (city.id === "newyork") {
    // water towers
    for (let i = 0; i < 6; i++) {
      const x = 150 + i * 330 + r() * 80,
        y = NEAR_H - 120 - r() * 120;
      ctx.fillStyle = "#0a0b10";
      rr(ctx, x, y - 34, 34, 30, 4);
      ctx.fill();
      poly(ctx, [
        [x - 2, y - 34],
        [x + 36, y - 34],
        [x + 17, y - 50],
      ]);
      ctx.fill();
      ctx.fillRect(x + 4, y - 4, 3, 14);
      ctx.fillRect(x + 27, y - 4, 3, 14);
    }
  }
  if (city.id === "paris") {
    for (let x = 0; x < SKY_W; x += 70) {
      ctx.fillStyle = "#1a1626";
      ctx.fillRect(x + 20, NEAR_H - 190 - r() * 40, 10, 40); // chimneys
    }
  }
  // neon rim lights on some rooftops
  for (let i = 0; i < 14; i++) {
    const x = r() * SKY_W,
      y = NEAR_H - 60 - r() * (low ? 110 : 300);
    const col = p.neon[Math.floor(r() * p.neon.length)];
    glow(ctx, col, 12, () => {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 30 + r() * 60, 3);
    });
  }
  if (city.id === "tokyo" || city.id === "seoul") {
    for (let i = 0; i < 6; i++) {
      const x = 100 + i * 340 + r() * 80;
      const col = p.neon[i % p.neon.length];
      text(ctx, city.id === "tokyo" ? ["メタ", "ラッシュ", "東京", "ゲーム", "夜", "光"][i] : ["서울", "메타", "러시", "빛", "밤", "강남"][i], x, NEAR_H - 200 - r() * 100, 26, "#fff", { glow: col, vertical: true });
    }
  }
  return c;
}
