// Procedural painters for the Metawin masked runner. The front view is used across the UI (shop,
// profile, avatars); the back view frames are baked into sprite sheets for the in-game runner.
import type { CharacterLook } from "../data/cosmetics";
import { drawGlyph } from "./glyph";

type Ctx2D = CanvasRenderingContext2D;

function lin(ctx: Ctx2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function rad(ctx: Ctx2D, x: number, y: number, r0: number, r1: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function helmetPath(ctx: Ctx2D) {
  ctx.beginPath();
  ctx.moveTo(150, 24);
  ctx.bezierCurveTo(205, 24, 236, 66, 234, 118);
  ctx.bezierCurveTo(232, 160, 214, 186, 196, 200);
  ctx.bezierCurveTo(180, 212, 165, 218, 150, 218);
  ctx.bezierCurveTo(135, 218, 120, 212, 104, 200);
  ctx.bezierCurveTo(86, 186, 68, 160, 66, 118);
  ctx.bezierCurveTo(64, 66, 95, 24, 150, 24);
  ctx.closePath();
}

function visorPath(ctx: Ctx2D) {
  ctx.beginPath();
  ctx.moveTo(150, 82);
  ctx.bezierCurveTo(138, 66, 112, 58, 98, 70);
  ctx.bezierCurveTo(86, 80, 88, 112, 96, 136);
  ctx.bezierCurveTo(106, 166, 132, 190, 150, 202);
  ctx.bezierCurveTo(168, 190, 194, 166, 204, 136);
  ctx.bezierCurveTo(212, 112, 214, 80, 202, 70);
  ctx.bezierCurveTo(188, 58, 162, 66, 150, 82);
  ctx.closePath();
}

export function drawHelmetExtras(ctx: Ctx2D, style: string, look: CharacterLook, back = false) {
  ctx.save();
  if (style === "helm_antenna") {
    ctx.strokeStyle = look.helmet[2];
    ctx.lineWidth = 5;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(150 + s * 52, 52);
      ctx.lineTo(150 + s * 74, 0 + 6);
      ctx.stroke();
      ctx.fillStyle = "#59f3ff";
      ctx.shadowColor = "#59f3ff";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(150 + s * 74, 6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  } else if (style === "helm_crest") {
    ctx.fillStyle = lin(ctx, 150, 0, 150, 60, [
      [0, "#ff7ae6"],
      [1, "#b0128f"],
    ]);
    ctx.shadowColor = "#ff2bd6";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(140, 34);
    ctx.lineTo(150, -6);
    ctx.lineTo(166, 6);
    ctx.lineTo(162, back ? 120 : 40);
    ctx.closePath();
    ctx.fill();
  } else if (style === "helm_horns") {
    for (const s of [-1, 1]) {
      ctx.fillStyle = lin(ctx, 150 + s * 60, 60, 150 + s * 100, 0, [
        [0, "#9aa3b5"],
        [0.5, "#ffffff"],
        [1, "#7b8396"],
      ]);
      ctx.beginPath();
      ctx.moveTo(150 + s * 50, 58);
      ctx.quadraticCurveTo(150 + s * 96, 50, 150 + s * 104, 0);
      ctx.quadraticCurveTo(150 + s * 82, 40, 150 + s * 64, 78);
      ctx.closePath();
      ctx.fill();
    }
  } else if (style === "helm_halo") {
    ctx.strokeStyle = "#ffe14d";
    ctx.lineWidth = 7;
    ctx.shadowColor = "#ffe14d";
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.ellipse(150, 8, 62, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Bust portrait in a 300×300 design space. Scales to the canvas size. */
export function paintCharacterFront(canvas: HTMLCanvasElement, look: CharacterLook, helmetStyle = "helm_standard", opts: { background?: boolean } = {}) {
  const ctx = canvas.getContext("2d")!;
  const s = Math.min(canvas.width, canvas.height) / 300;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate((canvas.width - 300 * s) / 2, (canvas.height - 300 * s) / 2);
  ctx.scale(s, s);

  if (opts.background) {
    ctx.fillStyle = rad(ctx, 150, 140, 10, 220, [
      [0, "#2a0d4a"],
      [1, "#05030b"],
    ]);
    ctx.fillRect(0, 0, 300, 300);
    // city light bokeh
    for (let i = 0; i < 40; i++) {
      const x = (i * 73) % 300;
      const y = (i * 41) % 200;
      ctx.fillStyle = i % 3 ? "rgba(180,77,255,0.25)" : "rgba(89,243,255,0.22)";
      ctx.fillRect(x, y, 4, 8);
    }
  }

  // ── Shoulders / coat ──
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(10, 300);
  ctx.bezierCurveTo(14, 262, 40, 236, 96, 222);
  ctx.lineTo(204, 222);
  ctx.bezierCurveTo(260, 236, 286, 262, 290, 300);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 220, 0, 300, [
    [0, look.jacket[0]],
    [1, look.jacket[1]],
  ]);
  ctx.fill();
  // quilted texture
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  for (let i = -300; i < 300; i += 12) {
    ctx.beginPath();
    ctx.moveTo(i, 300);
    ctx.lineTo(i + 80, 220);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // vest
  ctx.beginPath();
  ctx.moveTo(112, 226);
  ctx.lineTo(188, 226);
  ctx.lineTo(176, 300);
  ctx.lineTo(124, 300);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 120, 226, 180, 300, [
    [0, look.vest],
    [1, "#00000088"],
  ]);
  ctx.fill();
  // lapels
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(150 + sgn * 40, 222);
    ctx.lineTo(150 + sgn * 70, 236);
    ctx.lineTo(150 + sgn * 34, 300);
    ctx.lineTo(150 + sgn * 22, 300);
    ctx.closePath();
    ctx.fillStyle = look.jacket[0];
    ctx.fill();
    ctx.strokeStyle = look.trim;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // shoulder armor
    ctx.fillStyle = lin(ctx, 150 + sgn * 120, 230, 150 + sgn * 120, 280, [
      [0, "#3b3f4c"],
      [1, "#101219"],
    ]);
    ctx.beginPath();
    ctx.ellipse(150 + sgn * 118, 262, 34, 26, sgn * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = look.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    // strap + buckle
    ctx.strokeStyle = "#0b0c12";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(150 + sgn * 92, 228);
    ctx.lineTo(150 + sgn * 50, 300);
    ctx.stroke();
    ctx.fillStyle = look.accent;
    ctx.fillRect(150 + sgn * 70 - 6, 262, 12, 9);
  }
  // collar + bowtie
  ctx.fillStyle = "#e9e3f5";
  ctx.beginPath();
  ctx.moveTo(130, 222);
  ctx.lineTo(150, 236);
  ctx.lineTo(170, 222);
  ctx.lineTo(160, 216);
  ctx.lineTo(140, 216);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = look.jacket[1];
  ctx.beginPath();
  ctx.moveTo(150, 236);
  ctx.lineTo(128, 226);
  ctx.lineTo(128, 248);
  ctx.closePath();
  ctx.moveTo(150, 236);
  ctx.lineTo(172, 226);
  ctx.lineTo(172, 248);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = look.trim;
  ctx.beginPath();
  ctx.arc(150, 237, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // neck ring
  ctx.fillStyle = "#15161d";
  ctx.beginPath();
  ctx.ellipse(150, 216, 44, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Helmet ──
  drawHelmetExtras(ctx, helmetStyle, look);
  helmetPath(ctx);
  ctx.fillStyle = rad(ctx, 118, 70, 10, 190, [
    [0, look.helmet[0]],
    [0.45, look.helmet[1]],
    [1, look.helmet[2]],
  ]);
  ctx.fill();
  ctx.save();
  helmetPath(ctx);
  ctx.clip();
  // panel lines
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(150, 24);
  ctx.lineTo(150, 62);
  ctx.moveTo(80, 90);
  ctx.quadraticCurveTo(70, 150, 104, 200);
  ctx.moveTo(220, 90);
  ctx.quadraticCurveTo(230, 150, 196, 200);
  ctx.stroke();
  // ear discs
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = rad(ctx, 150 + sgn * 78, 134, 2, 26, [
      [0, look.helmet[0]],
      [1, look.helmet[2]],
    ]);
    ctx.beginPath();
    ctx.ellipse(150 + sgn * 80, 136, 16, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.stroke();
  }
  // specular highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(112, 52, 26, 10, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // visor
  visorPath(ctx);
  ctx.fillStyle = lin(ctx, 150, 60, 150, 200, [
    [0, "#1b1d26"],
    [0.4, look.visor],
    [1, "#000000"],
  ]);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  visorPath(ctx);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(96, 70);
  ctx.lineTo(126, 70);
  ctx.lineTo(96, 140);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // glowing symbol
  drawGlyph(ctx, 122, 98, 56, look.glow, look.glow, 22);
  drawGlyph(ctx, 122, 98, 56, "rgba(255,255,255,0.55)");
  ctx.restore();
}

// ── Back view (in-game) ──────────────────────────────────────────────────

export type BackPose =
  | { kind: "run"; phase: number }
  | { kind: "jump"; t: number }
  | { kind: "slide"; t: number }
  | { kind: "crash" };

function limb(ctx: Ctx2D, x0: number, y0: number, x1: number, y1: number, w: number, color: string | CanvasGradient) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/**
 * Paint the runner seen from behind into a 160×240 design box with feet at y=236.
 */
export function paintCharacterBack(ctx: Ctx2D, look: CharacterLook, helmetStyle: string, pose: BackPose) {
  const cx = 80;
  let lift = 0; // body lift (jump)
  let crouch = 0; // 0..1 (slide)
  let phase = 0;
  if (pose.kind === "run") phase = pose.phase;
  if (pose.kind === "jump") lift = 0;
  if (pose.kind === "slide") crouch = 1;

  const bob = pose.kind === "run" ? Math.abs(Math.sin(phase * Math.PI * 2)) * 5 : 0;
  const hipY = 156 + crouch * 46 - bob - lift;
  const shoulderY = 92 + crouch * 78 - bob - lift;
  const headY = 54 + crouch * 92 - bob - lift;
  const sway = pose.kind === "run" ? Math.sin(phase * Math.PI * 2) * 3 : 0;

  // ground shadow drawn by the scene, not here.
  const pants = look.pants;
  const boots = look.boots;

  // ── Legs ──
  const legs: { hx: number; kneeX: number; kneeY: number; footX: number; footY: number; sole: boolean }[] = [];
  for (const side of [-1, 1]) {
    const hx = cx + side * 15 + sway;
    if (pose.kind === "run") {
      const p = Math.sin((phase + (side > 0 ? 0.5 : 0)) * Math.PI * 2); // -1 back .. 1 forward
      const footLift = Math.max(0, -p) * 34 + Math.max(0, p) * 10;
      legs.push({ hx, kneeX: hx + side * 3, kneeY: hipY + 38 - Math.max(0, p) * 16, footX: hx + side * 4, footY: 234 - footLift, sole: p < -0.2 });
    } else if (pose.kind === "jump") {
      const tuck = Math.sin(Math.min(1, pose.t) * Math.PI);
      legs.push({ hx, kneeX: hx + side * 12, kneeY: hipY + 34 - tuck * 14, footX: hx + side * 6, footY: hipY + 70 - tuck * 34, sole: side > 0 });
    } else if (pose.kind === "slide") {
      legs.push({ hx, kneeX: hx + side * 26, kneeY: hipY + 14, footX: hx + side * 34, footY: 232, sole: true });
    } else {
      legs.push({ hx, kneeX: hx + side * 20, kneeY: hipY + 30, footX: hx + side * 32, footY: hipY + 50, sole: true });
    }
  }
  // draw the raised (toward-camera) leg last
  legs.sort((a, b) => b.footY - a.footY);
  for (const l of legs) {
    limb(ctx, l.hx, hipY, l.kneeX, l.kneeY, 20, pants);
    limb(ctx, l.kneeX, l.kneeY, l.footX, l.footY - 6, 17, pants);
    ctx.fillStyle = boots;
    ctx.beginPath();
    ctx.ellipse(l.footX, l.footY - 2, 11, l.sole ? 12 : 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (l.sole) {
      ctx.fillStyle = look.accent;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(l.footX, l.footY, 8, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = look.glow;
      ctx.fillRect(l.footX - 6, l.footY + 2, 12, 3);
    }
  }

  // ── Arms (behind torso edges) ──
  const arms: [number, number, number, number, number, number][] = [];
  for (const side of [-1, 1]) {
    const sx = cx + side * 33 + sway;
    let ex: number, ey: number, hx: number, hy: number;
    if (pose.kind === "run") {
      const p = Math.sin((phase + (side > 0 ? 0 : 0.5)) * Math.PI * 2);
      ex = sx + side * 10;
      ey = shoulderY + 30 - p * 6;
      hx = sx + side * 6 - side * p * 4;
      hy = shoulderY + 54 - p * 22;
    } else if (pose.kind === "jump") {
      ex = sx + side * 22;
      ey = shoulderY + 6;
      hx = sx + side * 38;
      hy = shoulderY - 22;
    } else if (pose.kind === "slide") {
      ex = sx + side * 22;
      ey = shoulderY + 18;
      hx = sx + side * 34;
      hy = 230;
    } else {
      ex = sx + side * 28;
      ey = shoulderY - 6;
      hx = sx + side * 42;
      hy = shoulderY - 30;
    }
    arms.push([sx, shoulderY + 6, ex, ey, hx, hy]);
  }
  for (const [sx, sy, ex, ey, hx, hy] of arms) {
    limb(ctx, sx, sy, ex, ey, 16, look.jacket[1]);
    limb(ctx, ex, ey, hx, hy, 14, look.jacket[0]);
    ctx.fillStyle = "#14141c";
    ctx.beginPath();
    ctx.arc(hx, hy, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Coat ──
  const tw = 70;
  const flap = pose.kind === "run" ? Math.sin(phase * Math.PI * 4) * 5 : pose.kind === "jump" ? -8 : 0;
  ctx.beginPath();
  ctx.moveTo(cx - tw / 2 + sway, shoulderY);
  ctx.quadraticCurveTo(cx + sway, shoulderY - 8, cx + tw / 2 + sway, shoulderY);
  ctx.lineTo(cx + 30 + sway, hipY - 4);
  ctx.lineTo(cx + 34 + sway + flap, hipY + 26 - crouch * 14);
  ctx.lineTo(cx + 4 + sway, hipY + 20 - crouch * 14);
  ctx.lineTo(cx - 4 + sway, hipY + 20 - crouch * 14);
  ctx.lineTo(cx - 34 + sway - flap, hipY + 26 - crouch * 14);
  ctx.lineTo(cx - 30 + sway, hipY - 4);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, cx - 40, shoulderY, cx + 40, hipY, [
    [0, look.jacket[0]],
    [0.6, look.jacket[1]],
    [1, look.jacket[1]],
  ]);
  ctx.fill();
  ctx.strokeStyle = look.trim;
  ctx.lineWidth = 2;
  ctx.stroke();
  // center seam + vent
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.moveTo(cx + sway, shoulderY + 4);
  ctx.lineTo(cx + sway, hipY + 18 - crouch * 14);
  ctx.stroke();
  // harness straps (X)
  ctx.strokeStyle = "#0b0c12";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx - 28 + sway, shoulderY + 4);
  ctx.lineTo(cx + 22 + sway, hipY - 10);
  ctx.moveTo(cx + 28 + sway, shoulderY + 4);
  ctx.lineTo(cx - 22 + sway, hipY - 10);
  ctx.stroke();
  ctx.fillStyle = look.accent;
  ctx.fillRect(cx - 6 + sway, (shoulderY + hipY) / 2 - 6, 12, 10);
  // glowing emblem between shoulder blades
  drawGlyph(ctx, cx - 13 + sway, shoulderY + 10, 26, look.glow, look.glow, 10);
  // belt
  ctx.fillStyle = "#101119";
  ctx.fillRect(cx - 29 + sway, hipY - 8, 58, 8);
  ctx.fillStyle = look.accent;
  ctx.fillRect(cx - 4 + sway, hipY - 8, 8, 8);
  // collar (green, the vest peeking at the neck)
  ctx.fillStyle = look.vest;
  ctx.beginPath();
  ctx.ellipse(cx + sway, shoulderY - 2, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Helmet (back) ──
  ctx.save();
  ctx.translate(cx + sway - 150 * 0.3, headY - 120 * 0.3);
  ctx.scale(0.3, 0.3);
  drawHelmetExtras(ctx, helmetStyle, look, true);
  helmetPath(ctx);
  ctx.fillStyle = rad(ctx, 120, 70, 10, 190, [
    [0, look.helmet[0]],
    [0.5, look.helmet[1]],
    [1, look.helmet[2]],
  ]);
  ctx.fill();
  ctx.save();
  helmetPath(ctx);
  ctx.clip();
  // visor wrap visible at the sides
  ctx.fillStyle = "#06070b";
  ctx.beginPath();
  ctx.ellipse(62, 128, 18, 50, 0.1, 0, Math.PI * 2);
  ctx.ellipse(238, 128, 18, 50, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // panel ridge + rear light bar
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(150, 24);
  ctx.lineTo(150, 150);
  ctx.moveTo(84, 92);
  ctx.quadraticCurveTo(150, 120, 216, 92);
  ctx.stroke();
  ctx.fillStyle = look.glow;
  ctx.shadowColor = look.glow;
  ctx.shadowBlur = 20;
  ctx.fillRect(104, 168, 92, 10);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(112, 56, 30, 12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}
