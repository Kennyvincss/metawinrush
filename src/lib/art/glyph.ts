// The Metawin "MW" monogram as vector polygons in a unit square (0..1), used for coins, signs,
// helmet emblems and the visor symbol so the brand mark appears consistently across the game.
export const MW_GLYPH: [number, number][][] = [
  // left stem
  [
    [0.06, 0.1],
    [0.22, 0.1],
    [0.22, 0.74],
    [0.06, 0.86],
  ],
  // left diagonal (top-left down to the middle)
  [
    [0.06, 0.1],
    [0.24, 0.1],
    [0.56, 0.58],
    [0.47, 0.72],
  ],
  // right diagonal (middle up to top-right)
  [
    [0.47, 0.72],
    [0.56, 0.58],
    [0.8, 0.22],
    [0.8, 0.46],
  ],
  // right stem
  [
    [0.78, 0.14],
    [0.94, 0.06],
    [0.94, 0.9],
    [0.78, 0.9],
  ],
  // lower "N" diagonal
  [
    [0.3, 0.9],
    [0.5, 0.9],
    [0.94, 0.42],
    [0.94, 0.2],
  ],
];

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function drawGlyph(ctx: Ctx2D, x: number, y: number, size: number, fill: string | CanvasGradient, glow?: string, glowBlur = 0) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = glowBlur || size * 0.25;
  }
  ctx.fillStyle = fill;
  for (const poly of MW_GLYPH) {
    ctx.beginPath();
    poly.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * size, y + py * size) : ctx.moveTo(x + px * size, y + py * size)));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
