import { describe, expect, it } from "vitest";
import { CITIES } from "@/lib/data/cities";
import { TrackGenerator, speedAt, type Catalog, type GenObstacle } from "@/game/core/generator";
import { MOVING_TRIGGER } from "@/game/core/constants";

const catalog: Catalog = {
  low: [{ len: 0.7, h: 0.9 }, { len: 0.7, h: 0.85 }],
  overhead: [{ len: 0.6, h: 1.2, top: 2.7 }],
  block: [{ len: 4.6, h: 1.7 }, { len: 8, h: 3 }, { len: 5, h: 2.7 }],
  long: [{ len: 36, h: 3.6 }, { len: 11.5, h: 3.1 }],
  moving: [{ len: 4.5, h: 1.5 }, { len: 5.2, h: 2.3 }],
};

const HARD = new Set(["block", "long"]);

function generate(seed: number, cityIdx: number, distance = 25000) {
  const d = CITIES[cityIdx].difficulty;
  const gen = new TrackGenerator(seed, d, catalog);
  return gen.generate(distance, (z) => speedAt(d, z));
}

describe("track generator fairness", () => {
  it("never blocks all three lanes with unjumpable obstacles", () => {
    for (let city = 0; city < CITIES.length; city++) {
      for (let seed = 1; seed <= 12; seed++) {
        const { obstacles } = generate(seed * 7919, city);
        const statics = obstacles.filter((o) => o.speed === 0);
        // sweep along z: at every point at least one lane must be free of hard blockers
        const events = statics.filter((o) => HARD.has(o.kind));
        for (const o of events) {
          for (const z of [o.z + 0.01, o.z + o.len / 2, o.z + o.len - 0.01]) {
            const blocked = new Set(events.filter((e) => e.z <= z && e.z + e.len >= z).map((e) => e.lane));
            expect(blocked.size, `city ${CITIES[city].id} seed ${seed} at z=${z.toFixed(1)}`).toBeLessThan(3);
          }
        }
      }
    }
  });

  it("keeps an oncoming vehicle's lane clear of other obstacles along its path", () => {
    for (let city = 0; city < CITIES.length; city++) {
      for (let seed = 1; seed <= 12; seed++) {
        const { obstacles } = generate(seed * 104729, city);
        const d = CITIES[city].difficulty;
        for (const m of obstacles.filter((o) => o.speed > 0)) {
          const v = speedAt(d, m.z - MOVING_TRIGGER);
          const meet = m.z - (m.speed * MOVING_TRIGGER) / (v + m.speed);
          const conflict = obstacles.find((o: GenObstacle) => o !== m && o.lane === m.lane && o.z + o.len > meet - 6 && o.z < m.z + m.len);
          expect(conflict, `city ${CITIES[city].id} seed ${seed}`).toBeUndefined();
        }
      }
    }
  });

  it("leaves enough reaction distance between consecutive rows", () => {
    for (let city = 0; city < CITIES.length; city++) {
      const d = CITIES[city].difficulty;
      const { obstacles } = generate(99, city);
      const starts = [...new Set(obstacles.filter((o) => o.speed === 0).map((o) => Math.round(o.z)))].sort((a, b) => a - b);
      let prevEnd = -Infinity;
      for (const z of starts) {
        const row = obstacles.filter((o) => o.speed === 0 && Math.abs(o.z - z) < 10);
        if (z - prevEnd > 0) expect(z - prevEnd).toBeGreaterThanOrEqual(speedAt(d, z) * d.minRowGap * 0.95);
        prevEnd = Math.max(prevEnd, ...row.map((o) => o.z + o.len));
      }
    }
  });

  it("is deterministic for a given seed", () => {
    expect(generate(1234, 0, 3000)).toEqual(generate(1234, 0, 3000));
  });
});
