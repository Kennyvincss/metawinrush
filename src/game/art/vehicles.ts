// Vehicles painted as the face the player sees: the rear of stopped traffic, the front of oncoming traffic.
import { glow, lg, makeCanvas, poly, rg, rr, shade, text, withAlpha, type C2D } from "./canvas";

export type VehicleType =
  | "car"
  | "taxi"
  | "cab"
  | "supercar"
  | "suv"
  | "van"
  | "truck"
  | "bus"
  | "doubledecker"
  | "danfo"
  | "keke"
  | "train"
  | "tram"
  | "scooter"
  | "digger";

export interface VehicleStyle {
  type: VehicleType;
  body: string;
  accent?: string;
  label?: string;
  view: "rear" | "front";
}

export const VEHICLE_DIMS: Record<VehicleType, [number, number]> = {
  car: [1.9, 1.45],
  taxi: [1.9, 1.7],
  cab: [1.85, 1.75],
  supercar: [2.0, 1.15],
  suv: [2.0, 1.85],
  van: [2.0, 2.3],
  truck: [2.3, 3.0],
  bus: [2.4, 3.1],
  doubledecker: [2.4, 4.3],
  danfo: [2.0, 2.25],
  keke: [1.4, 1.75],
  train: [2.6, 3.6],
  tram: [2.5, 3.3],
  scooter: [1.0, 1.75],
  digger: [2.2, 2.7],
};

const PX = 80;

function wheels(ctx: C2D, w: number, h: number, inset: number, ww: number, wh: number) {
  ctx.fillStyle = "#07070a";
  rr(ctx, inset, h - wh, ww, wh, 5);
  ctx.fill();
  rr(ctx, w - inset - ww, h - wh, ww, wh, 5);
  ctx.fill();
}

function lights(ctx: C2D, x: number, y: number, w: number, h: number, front: boolean, color?: string) {
  const c = color ?? (front ? "#fff6d8" : "#ff2238");
  glow(ctx, c, front ? 26 : 18, () => {
    ctx.fillStyle = c;
    rr(ctx, x, y, w, h, Math.min(w, h) / 2.5);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  rr(ctx, x + w * 0.2, y + h * 0.2, w * 0.35, h * 0.35, 3);
  ctx.fill();
}

function glass(ctx: C2D, x: number, y: number, w: number, h: number, r = 8, tint = "#0b1220") {
  ctx.fillStyle = lg(ctx, 0, y, 0, y + h, [shade(tint, 0.25), tint, "#020306"]);
  rr(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  poly(ctx, [
    [x + w * 0.1, y],
    [x + w * 0.35, y],
    [x + w * 0.15, y + h],
    [x - w * 0.1, y + h],
  ]);
  ctx.fill();
  ctx.restore();
}

function plate(ctx: C2D, cx: number, y: number, label = "MW 777", color = "#f2f2f2") {
  ctx.fillStyle = color;
  rr(ctx, cx - 34, y, 68, 18, 3);
  ctx.fill();
  text(ctx, label, cx, y + 9.5, 11, "#111", { weight: "900" });
}

export function paintVehicle(style: VehicleStyle): HTMLCanvasElement {
  const [mw, mh] = VEHICLE_DIMS[style.type];
  const w = Math.round(mw * PX);
  const h = Math.round(mh * PX);
  const [c, ctx] = makeCanvas(w, h);
  const front = style.view === "front";
  const body = style.body;
  const accent = style.accent ?? "#59f3ff";
  const bodyGrad = lg(ctx, 0, 0, 0, h, [shade(body, 0.25), body, shade(body, -0.45)]);

  switch (style.type) {
    case "car":
    case "taxi":
    case "cab":
    case "suv":
    case "supercar": {
      const roofTop = style.type === "supercar" ? h * 0.18 : style.type === "taxi" ? h * 0.16 : h * 0.06;
      const shoulder = style.type === "supercar" ? h * 0.48 : h * 0.5;
      wheels(ctx, w, h, 8, 30, h * 0.22);
      // greenhouse
      ctx.fillStyle = shade(body, -0.2);
      poly(ctx, [
        [w * 0.2, roofTop],
        [w * 0.8, roofTop],
        [w * 0.9, shoulder],
        [w * 0.1, shoulder],
      ]);
      ctx.fill();
      glass(ctx, w * 0.22, roofTop + 6, w * 0.56, shoulder - roofTop - 10, 10, front ? "#0d1a2a" : "#0b0f1a");
      // body
      ctx.fillStyle = bodyGrad;
      rr(ctx, 2, shoulder - 4, w - 4, h * 0.42, [14, 14, 10, 10]);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(6, shoulder, w - 12, 3);
      if (front) {
        lights(ctx, 10, shoulder + 10, w * 0.22, 14, true);
        lights(ctx, w - 10 - w * 0.22, shoulder + 10, w * 0.22, 14, true);
        ctx.fillStyle = "#0a0a0f";
        rr(ctx, w * 0.32, shoulder + 12, w * 0.36, 16, 6);
        ctx.fill();
        glow(ctx, accent, 10, () => {
          ctx.fillStyle = accent;
          ctx.fillRect(w * 0.3, shoulder + 34, w * 0.4, 3);
        });
      } else {
        lights(ctx, 8, shoulder + 8, w * 0.25, 12, false);
        lights(ctx, w - 8 - w * 0.25, shoulder + 8, w * 0.25, 12, false);
        glow(ctx, "#ff2238", 8, () => {
          ctx.fillStyle = "#ff3b4e";
          ctx.fillRect(w * 0.3, shoulder + 13, w * 0.4, 3);
        });
        plate(ctx, w / 2, shoulder + 26);
      }
      ctx.fillStyle = "#0b0b10";
      rr(ctx, 4, h * 0.82, w - 8, h * 0.08, 4);
      ctx.fill();
      if (style.type === "taxi") {
        ctx.fillStyle = "#111";
        ctx.fillRect(w * 0.06, shoulder + h * 0.2, w * 0.88, 6);
        ctx.fillStyle = "#fff";
        for (let i = 0; i < 12; i++) if (i % 2) ctx.fillRect(w * 0.06 + (i * w * 0.88) / 12, shoulder + h * 0.2, (w * 0.88) / 12, 3);
        glow(ctx, "#ffe14d", 12, () => {
          ctx.fillStyle = "#fff4b8";
          rr(ctx, w * 0.36, 0, w * 0.28, h * 0.12, 4);
          ctx.fill();
        });
        text(ctx, style.label ?? "TAXI", w / 2, h * 0.06, 12, "#222");
      }
      if (style.type === "cab") {
        glow(ctx, "#ffb347", 12, () => {
          ctx.fillStyle = "#ffcf7a";
          rr(ctx, w * 0.38, roofTop - 12, w * 0.24, 12, 3);
          ctx.fill();
        });
      }
      if (style.type === "supercar") {
        ctx.fillStyle = shade(body, -0.5);
        ctx.fillRect(w * 0.05, roofTop + 6, w * 0.9, 6); // spoiler
        glow(ctx, accent, 14, () => {
          ctx.fillStyle = accent;
          ctx.fillRect(w * 0.08, h * 0.74, w * 0.84, 3);
        });
      }
      break;
    }
    case "van":
    case "truck":
    case "danfo": {
      wheels(ctx, w, h, 10, 34, h * 0.14);
      ctx.fillStyle = bodyGrad;
      rr(ctx, 2, 2, w - 4, h * 0.86, [16, 16, 8, 8]);
      ctx.fill();
      if (style.type === "danfo") {
        // Lagos minibus: yellow with black stripes
        ctx.fillStyle = "#121212";
        ctx.fillRect(2, h * 0.52, w - 4, 10);
        ctx.fillRect(2, h * 0.62, w - 4, 6);
        ctx.fillStyle = "#2b2b2b";
        ctx.fillRect(w * 0.1, 0, w * 0.8, 6); // roof rack
        glass(ctx, w * 0.12, h * 0.15, w * 0.76, h * 0.3, 10);
        text(ctx, style.label ?? "OSHODI · CMS", w / 2, h * 0.09, 12, "#111", { maxWidth: w * 0.8 });
      } else if (front) {
        glass(ctx, w * 0.1, h * 0.12, w * 0.8, h * 0.3, 10, "#0d1a2a");
      } else {
        // rear doors
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w / 2, 10);
        ctx.lineTo(w / 2, h * 0.78);
        ctx.stroke();
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(w / 2 - 24, h * 0.42, 10, 30);
        ctx.fillRect(w / 2 + 14, h * 0.42, 10, 30);
        if (style.label) {
          glow(ctx, accent, 10, () => text(ctx, style.label!, w / 2, h * 0.22, w * 0.12, accent));
        }
      }
      lights(ctx, 8, h * 0.66, w * 0.2, 14, front);
      lights(ctx, w - 8 - w * 0.2, h * 0.66, w * 0.2, 14, front);
      if (!front) plate(ctx, w / 2, h * 0.7);
      ctx.fillStyle = "#0b0b10";
      rr(ctx, 4, h * 0.8, w - 8, h * 0.07, 4);
      ctx.fill();
      break;
    }
    case "bus":
    case "doubledecker":
    case "tram":
    case "train": {
      const isTrain = style.type === "train" || style.type === "tram";
      if (!isTrain) wheels(ctx, w, h, 12, 36, h * 0.1);
      ctx.fillStyle = bodyGrad;
      const top = style.type === "train" ? 0 : 2;
      rr(ctx, 2, top, w - 4, h * (isTrain ? 0.92 : 0.9), style.type === "train" ? [w * 0.35, w * 0.35, 10, 10] : [18, 18, 8, 8]);
      ctx.fill();
      if (style.type === "doubledecker") {
        glass(ctx, w * 0.08, h * 0.08, w * 0.84, h * 0.22, 8);
        glass(ctx, w * 0.08, h * 0.42, w * 0.84, h * 0.2, 8);
        ctx.fillStyle = "#111";
        rr(ctx, w * 0.2, h * 0.34, w * 0.6, h * 0.05, 3);
        ctx.fill();
        glow(ctx, "#ffb347", 8, () => text(ctx, style.label ?? "73  OXFORD CIRCUS", w / 2, h * 0.365, 12, "#ffb347"));
      } else if (style.type === "train") {
        glass(ctx, w * 0.18, h * 0.14, w * 0.64, h * 0.24, 22);
        glow(ctx, accent, 16, () => {
          ctx.fillStyle = accent;
          ctx.fillRect(4, h * 0.5, w - 8, 8);
        });
        text(ctx, style.label ?? "MW EXPRESS", w / 2, h * 0.6, 14, "#fff");
      } else {
        glass(ctx, w * 0.07, h * 0.1, w * 0.86, h * 0.36, 8);
        ctx.fillStyle = "#0d0d12";
        rr(ctx, w * 0.12, h * 0.02, w * 0.76, h * 0.07, 3);
        ctx.fill();
        glow(ctx, accent, 8, () => text(ctx, style.label ?? "M1  METAWIN", w / 2, h * 0.055, 13, accent));
        ctx.fillStyle = withAlpha(accent, 0.9);
        ctx.fillRect(4, h * 0.55, w - 8, 6);
      }
      lights(ctx, 10, h * 0.72, w * 0.16, 14, front);
      lights(ctx, w - 10 - w * 0.16, h * 0.72, w * 0.16, 14, front);
      if (!isTrain && !front) plate(ctx, w / 2, h * 0.76);
      if (isTrain) {
        ctx.fillStyle = "#0b0b10";
        ctx.fillRect(10, h * 0.9, w - 20, h * 0.1);
      }
      break;
    }
    case "keke": {
      // three-wheeled tricycle taxi
      wheels(ctx, w, h, 4, 22, h * 0.16);
      ctx.fillStyle = bodyGrad;
      rr(ctx, 4, h * 0.08, w - 8, h * 0.78, [w * 0.4, w * 0.4, 10, 10]);
      ctx.fill();
      ctx.fillStyle = "#151515";
      rr(ctx, 4, h * 0.05, w - 8, h * 0.12, [30, 30, 4, 4]);
      ctx.fill();
      glass(ctx, w * 0.16, h * 0.22, w * 0.68, h * 0.26, 10);
      ctx.fillStyle = "#111";
      ctx.fillRect(4, h * 0.56, w - 8, 8);
      lights(ctx, 10, h * 0.64, 22, 12, front);
      lights(ctx, w - 32, h * 0.64, 22, 12, front);
      break;
    }
    case "scooter": {
      // delivery scooter with rider and box
      ctx.fillStyle = "#07070a";
      rr(ctx, w * 0.38, h * 0.78, w * 0.24, h * 0.22, 6);
      ctx.fill();
      ctx.fillStyle = bodyGrad;
      rr(ctx, w * 0.12, h * 0.05, w * 0.76, h * 0.38, 10);
      ctx.fill(); // delivery box
      glow(ctx, accent, 10, () => text(ctx, style.label ?? "배달", w / 2, h * 0.24, 18, accent));
      ctx.fillStyle = "#1a1a24";
      rr(ctx, w * 0.25, h * 0.42, w * 0.5, h * 0.3, 12);
      ctx.fill(); // rider
      ctx.fillStyle = shade(body, -0.3);
      rr(ctx, w * 0.3, h * 0.66, w * 0.4, h * 0.16, 6);
      ctx.fill();
      lights(ctx, w * 0.4, h * 0.7, w * 0.2, 10, front);
      break;
    }
    case "digger": {
      // compact excavator from behind
      ctx.fillStyle = "#14141a";
      rr(ctx, 2, h * 0.78, w - 4, h * 0.22, 10);
      ctx.fill(); // tracks
      ctx.strokeStyle = "#2a2a33";
      ctx.lineWidth = 3;
      for (let x = 10; x < w - 6; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.8);
        ctx.lineTo(x, h * 0.98);
        ctx.stroke();
      }
      ctx.fillStyle = bodyGrad;
      rr(ctx, 8, h * 0.4, w - 16, h * 0.4, 12);
      ctx.fill();
      ctx.fillStyle = shade(body, -0.2);
      rr(ctx, w * 0.12, h * 0.08, w * 0.46, h * 0.36, 8);
      ctx.fill(); // cab
      glass(ctx, w * 0.16, h * 0.12, w * 0.38, h * 0.24, 6);
      // arm
      ctx.fillStyle = body;
      poly(ctx, [
        [w * 0.66, h * 0.42],
        [w * 0.82, 0],
        [w * 0.95, 0],
        [w * 0.8, h * 0.42],
      ]);
      ctx.fill();
      ctx.fillStyle = "#111";
      for (let i = 0; i < 6; i++) ctx.fillRect(10 + i * ((w - 30) / 6), h * 0.7, (w - 30) / 12, 8); // hazard stripes
      glow(ctx, "#ffb000", 18, () => {
        ctx.fillStyle = "#ffb000";
        ctx.beginPath();
        ctx.arc(w * 0.35, h * 0.06, 8, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
  }
  // soft ambient occlusion under the vehicle
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = rg(ctx, w / 2, h, 4, w * 0.6, ["rgba(0,0,0,0.6)", "rgba(0,0,0,0)"]);
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
  ctx.globalCompositeOperation = "source-over";
  return c;
}
