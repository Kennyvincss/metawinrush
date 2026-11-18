"use client";
// Score card image generator + X (Twitter) sharing.
import { paintCharacterFront } from "./art/character";
import { drawGlyph } from "./art/glyph";
import { getCity, type CityId } from "./data/cities";
import { getLook } from "./data/cosmetics";
import { paintSky, paintSkylineFar } from "@/game/art/skylines";

export function xIntentUrl(text: string, url?: string) {
  const q = new URLSearchParams({ text });
  if (url) q.set("url", url);
  return `https://x.com/intent/post?${q}`;
}

export function shareText(text: string) {
  window.open(xIntentUrl(text, window.location.origin), "_blank", "noopener,noreferrer");
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export interface ScorecardData {
  username: string;
  score: number;
  distance: number;
  coins: number;
  city: CityId;
  characterId: string;
  helmet: string;
  newBest?: boolean;
  rank?: number | null;
}

/** 1200×675 social card. */
export async function renderScorecard(d: ScorecardData): Promise<HTMLCanvasElement> {
  const W = 1200,
    H = 675;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const city = getCity(d.city);
  ctx.drawImage(paintSky(city), 0, 0, 1024, 1024, 0, -120, W, H * 1.3);
  ctx.drawImage(paintSkylineFar(city), 200, 0, 1600, 760, 0, H - 600, W, 600);
  const shade = ctx.createLinearGradient(0, 0, W, 0);
  shade.addColorStop(0, "rgba(5,3,11,0.95)");
  shade.addColorStop(0.55, "rgba(5,3,11,0.75)");
  shade.addColorStop(1, "rgba(5,3,11,0.2)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  // neon frame
  ctx.strokeStyle = "#b44dff";
  ctx.shadowColor = "#b44dff";
  ctx.shadowBlur = 24;
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, W - 36, H - 36);
  ctx.shadowBlur = 0;

  // character
  const [logo, hero] = await Promise.all([loadImg("/brand/logo.jpg"), d.characterId === "char_masked" && d.helmet === "helm_standard" ? loadImg("/brand/character.jpg") : Promise.resolve(null)]);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(W - 470, 95, 400, 400, 36);
  ctx.clip();
  if (hero) ctx.drawImage(hero, W - 470, 95, 400, 400);
  else {
    const p = document.createElement("canvas");
    p.width = p.height = 400;
    paintCharacterFront(p, getLook(d.characterId), d.helmet, { background: true });
    ctx.drawImage(p, W - 470, 95);
  }
  ctx.restore();
  ctx.strokeStyle = "#38e8ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(W - 470, 95, 400, 400, 36);
  ctx.stroke();

  // header
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 100, 44, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, 56, 56, 88, 88);
    ctx.restore();
  } else drawGlyph(ctx, 60, 60, 80, "#fff");
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#38e8ff";
  ctx.font = "800 22px Orbitron, 'Segoe UI', sans-serif";
  ctx.fillText("METAWIN", 162, 92);
  const grad = ctx.createLinearGradient(162, 0, 520, 0);
  grad.addColorStop(0, "#b44dff");
  grad.addColorStop(1, "#38e8ff");
  ctx.fillStyle = grad;
  ctx.font = "900 46px Orbitron, 'Segoe UI', sans-serif";
  ctx.fillText("RUSH", 160, 138);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "700 26px 'Exo 2', 'Segoe UI', sans-serif";
  ctx.fillText(`@${d.username}  ·  ${city.name.toUpperCase()}`, 60, 225);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 112px Orbitron, 'Segoe UI', sans-serif";
  ctx.shadowColor = "#b44dff";
  ctx.shadowBlur = 30;
  ctx.fillText(d.score.toLocaleString(), 56, 350);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "700 22px Orbitron, 'Segoe UI', sans-serif";
  ctx.fillText(d.newBest ? "NEW PERSONAL BEST" : "FINAL SCORE", 60, 390);

  const stats: [string, string][] = [
    ["DISTANCE", `${d.distance.toLocaleString()} m`],
    ["META COINS", d.coins.toLocaleString()],
    ["RANK", d.rank ? `#${d.rank}` : "—"],
  ];
  stats.forEach(([k, v], i) => {
    const x = 60 + i * 215;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.roundRect(x, 430, 195, 100, 18);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "700 16px Orbitron, 'Segoe UI', sans-serif";
    ctx.fillText(k, x + 18, 465);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 32px 'Exo 2', 'Segoe UI', sans-serif";
    ctx.fillText(v, x + 18, 507);
  });
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "800 20px Orbitron, 'Segoe UI', sans-serif";
  ctx.fillText("RUN · COLLECT · COMPETE · WIN", 60, 600);
  return c;
}

export async function shareScorecard(d: ScorecardData) {
  const canvas = await renderScorecard(d);
  const text = `I just ran ${d.distance.toLocaleString()}m through ${getCity(d.city).name} and scored ${d.score.toLocaleString()} in METAWIN RUSH! 🏁 Run. Collect. Compete. Win.`;
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  const file = blob ? new File([blob], "metawin-rush-score.png", { type: "image/png" }) : null;
  // Mobile: native share sheet with the image attached (X app included).
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: "METAWIN RUSH" });
      return "shared";
    } catch {
      /* cancelled — fall through to the X intent */
    }
  }
  // Desktop: download the card and open X with the post prefilled (X intents can't attach images).
  if (blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "metawin-rush-score.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  shareText(text);
  return "intent";
}
