// Seeded, fair track generator. Pure TypeScript (no Phaser) so it can be unit-tested.
//
// The track is built from "rows". Every row leaves at least one lane the player can get through
// (an empty lane, or a lane with an obstacle that can be jumped or slid under), and rows are spaced
// so that, at the current speed, the player always has enough reaction time to reach that lane.
import type { CityDifficulty } from "@/lib/data/cities";
import { COIN_SPACING, type PowerUpKind } from "@/lib/rules";
import { JUMP_HEIGHT, JUMP_TIME, MOVING_TRIGGER } from "./constants";

export type ObstacleKind = "low" | "overhead" | "block" | "long" | "moving";

export interface ObstacleSize {
  len: number; // meters along the track
  h: number; // height of the solid part (for "overhead": bottom of the beam)
  top?: number; // overhead: top of the beam
  superJumpable?: boolean; // can be cleared with SUPER JUMP
}

export type Catalog = Record<ObstacleKind, ObstacleSize[]>;

export interface GenObstacle {
  id: number;
  kind: ObstacleKind;
  variant: number;
  lane: number;
  z: number; // near face (world z)
  len: number;
  speed: number; // > 0 for oncoming vehicles
}

export interface GenCoin {
  id: number;
  lane: number;
  z: number;
  y: number;
}

export interface GenPowerUp {
  id: number;
  kind: PowerUpKind;
  lane: number;
  z: number;
}

export interface GenBatch {
  obstacles: GenObstacle[];
  coins: GenCoin[];
  powerups: GenPowerUp[];
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function speedAt(d: CityDifficulty, distance: number) {
  return d.baseSpeed + (d.maxSpeed - d.baseSpeed) * (1 - Math.exp(-Math.max(0, distance) / d.ramp));
}

const PASSABLE: ObstacleKind[] = ["low", "overhead"];

export class TrackGenerator {
  private rng: () => number;
  private nextId = 1;
  /** World z after which the next row may start (end of the last row's longest obstacle). */
  cursor: number;
  private sinceDistance = 0;
  private lastPowerUpZ = 0;

  constructor(
    seed: number,
    private difficulty: CityDifficulty,
    private catalog: Catalog,
    startZ = 70,
    private powerupKinds: PowerUpKind[] = ["magnet", "shield", "scoreboost", "coinboost", "superjump"],
  ) {
    this.rng = mulberry32(seed);
    this.cursor = startZ;
  }

  private r(min: number, max: number) {
    return min + (max - min) * this.rng();
  }
  private pick<T>(arr: T[]): T {
    return arr[Math.floor(this.rng() * arr.length)];
  }
  private chance(p: number) {
    return this.rng() < p;
  }
  private variant(kind: ObstacleKind) {
    return Math.floor(this.rng() * this.catalog[kind].length);
  }

  /** Generate rows until the cursor passes `untilZ`. `speedFor(z)` estimates the player speed at world z. */
  generate(untilZ: number, speedFor: (z: number) => number): GenBatch {
    const out: GenBatch = { obstacles: [], coins: [], powerups: [] };
    while (this.cursor < untilZ) this.row(out, speedFor);
    return out;
  }

  private row(out: GenBatch, speedFor: (z: number) => number) {
    const d = this.difficulty;
    const z0 = this.cursor;
    const v = speedFor(z0);
    const progress = Math.min(1, Math.max(0, (v - d.baseSpeed) / (d.maxSpeed - d.baseSpeed)));
    const early = Math.min(1, z0 / 1500); // first 1.5 km eases in
    const reaction = 1.35 + (d.minRowGap - 1.35) * progress;
    const gap = v * (reaction + this.r(0, 0.55) * (1 - progress * 0.6));
    const rowZ = z0 + gap;

    const lanesBefore = [0, 1, 2];
    let rowEnd = rowZ;
    const safe: number[] = [];
    const placed: { lane: number; kind: ObstacleKind; len: number }[] = [];

    const add = (kind: ObstacleKind, lane: number, z: number, speed = 0) => {
      const variant = this.variant(kind);
      const size = this.catalog[kind][variant];
      const len = kind === "long" ? size.len : size.len;
      out.obstacles.push({ id: this.nextId++, kind, variant, lane, z, len, speed });
      placed.push({ lane, kind, len });
      rowEnd = Math.max(rowEnd, z + len);
    };

    const roll = this.rng();
    const movingP = z0 > 450 ? d.movingChance * (0.5 + 0.5 * early) : 0;
    const longP = z0 > 300 ? 0.16 : 0;
    const wallP = z0 > 600 ? 0.14 * early : 0;
    const doubleP = z0 > 200 ? d.doubleBlockChance * (0.4 + 0.6 * early) : 0;

    if (roll < movingP) {
      // Oncoming vehicle: lane L stays clear of everything else while the vehicle drives toward the player.
      const L = this.pick(lanesBefore);
      const vm = this.r(9, 15);
      const sweep = (vm * MOVING_TRIGGER) / (v + vm);
      const zs = rowZ + sweep + 12;
      add("moving", L, zs, vm);
      // Optionally block one of the other lanes near the start so the player has to pick the third lane.
      const others = lanesBefore.filter((l) => l !== L);
      const freeLane = this.pick(others);
      if (this.chance(0.55)) {
        const blocked = others.find((l) => l !== freeLane)!;
        add(this.pick(["block", "low", "overhead"] as ObstacleKind[]), blocked, rowZ);
      }
      safe.push(freeLane);
    } else if (roll < movingP + longP) {
      // Trains / convoys in one or two lanes.
      const count = this.chance(0.45 * early + 0.15) ? 2 : 1;
      const lanes = this.shuffle([0, 1, 2]);
      for (let i = 0; i < count; i++) add("long", lanes[i], rowZ + this.r(0, 6));
      safe.push(...lanes.slice(count));
    } else if (roll < movingP + longP + wallP) {
      // A full wall where every lane has something, but at least one lane can be jumped or slid.
      const lanes = [0, 1, 2];
      const passLane = this.pick(lanes);
      for (const l of lanes) {
        let kind: ObstacleKind;
        if (l === passLane) kind = this.pick(PASSABLE);
        else kind = this.chance(0.5) ? "block" : this.pick(PASSABLE);
        add(kind, l, rowZ);
        if (kind !== "block") safe.push(l);
      }
    } else if (roll < movingP + longP + wallP + doubleP) {
      const lanes = this.shuffle([0, 1, 2]);
      add(this.weightedKind(), lanes[0], rowZ);
      add(this.weightedKind(), lanes[1], rowZ + (this.chance(0.3) ? this.r(4, 9) : 0));
      safe.push(lanes[2]);
      for (const p of placed) if (PASSABLE.includes(p.kind)) safe.push(p.lane);
    } else {
      const lane = this.pick([0, 1, 2]);
      const kind = this.weightedKind();
      add(kind, lane, rowZ);
      safe.push(...[0, 1, 2].filter((l) => l !== lane));
      if (PASSABLE.includes(kind)) safe.push(lane);
    }

    // ── Coins and power-ups in the gap before this row ─────────────────────
    const gapStart = z0 + 3;
    const gapEnd = rowZ - 4;
    const coinLane = this.pick(safe.length ? safe : [1]);
    const wantPower = rowZ - this.lastPowerUpZ > 320 && z0 > 180 && this.chance(0.22);
    if (wantPower && gapEnd - gapStart > 10) {
      const kind = this.pick(this.powerupKinds);
      const z = (gapStart + gapEnd) / 2;
      out.powerups.push({ id: this.nextId++, kind, lane: coinLane, z });
      this.lastPowerUpZ = z;
    } else if (gapEnd - gapStart > 8 && this.chance(0.85)) {
      for (let z = gapStart; z < gapEnd; z += COIN_SPACING) out.coins.push({ id: this.nextId++, lane: coinLane, z, y: 0.9 });
    }
    // Coin arcs over jumpable obstacles reward the jump.
    for (const p of placed) {
      if (p.kind === "low" && this.chance(0.7)) this.arc(out, p.lane, rowZ, v);
    }

    this.cursor = rowEnd;
    this.sinceDistance = rowEnd;
  }

  private arc(out: GenBatch, lane: number, centerZ: number, v: number) {
    const span = v * JUMP_TIME * 0.9;
    const n = Math.max(3, Math.floor(span / COIN_SPACING));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.coins.push({ id: this.nextId++, lane, z: centerZ - span / 2 + t * span, y: 0.9 + JUMP_HEIGHT * 0.85 * 4 * t * (1 - t) });
    }
  }

  private weightedKind(): ObstacleKind {
    const r = this.rng();
    return r < 0.45 ? "block" : r < 0.75 ? "low" : "overhead";
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
