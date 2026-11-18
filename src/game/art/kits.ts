// A "city kit" bundles everything a run needs for one city: obstacle art + collision sizes,
// buildings, props, coins, sky and ambience. Kits are built lazily when a city is selected.
import { getCity, type CityDef, type CityId } from "@/lib/data/cities";
import type { Catalog, ObstacleKind } from "../core/generator";
import { LOW_DIMS, OVERHEAD_BEAM_BOTTOM, OVERHEAD_H, OVERHEAD_W, paintLow, paintOverhead, type LowType, type OverheadType } from "./barriers";
import { paintBuildings, type BuildingTex } from "./buildings";
import { shade } from "./canvas";
import { paintCoin, paintProp, type PropTex, type PropType } from "./props";
import { paintSkylineFar, paintSkylineNear, paintSky } from "./skylines";
import { paintVehicle, VEHICLE_DIMS, type VehicleType } from "./vehicles";

export interface ObstacleArt {
  canvas: HTMLCanvasElement; // the face the player sees
  w: number;
  h: number; // visual height (meters)
  len: number;
  box: boolean; // draw a 3D side + roof
  sideColor: string;
  roofColor: string;
  stripe?: string; // glowing window band along the side
  collideH: number; // solid height for collisions (low/block) or beam bottom (overhead)
  top?: number;
  superJumpable?: boolean;
}

export type Ambience = "rain" | "dust" | "fireflies" | "sparkle" | "mist" | "pixels" | "embers" | "steam";

export interface PropSpec {
  tex: PropTex;
  offset: number; // meters beyond the road edge
  spacing: number; // average meters between instances
  sides: "both" | "left" | "right";
}

export interface CityKit {
  city: CityDef;
  art: Record<ObstacleKind, ObstacleArt[]>;
  catalog: Catalog;
  buildings: BuildingTex[];
  props: PropSpec[];
  coin: HTMLCanvasElement;
  sky: HTMLCanvasElement;
  skylineFar: HTMLCanvasElement;
  skylineNear: HTMLCanvasElement;
  ambience: Ambience;
  buildingGap: number; // meters between road edge and building fronts
  street: StreetStyle;
}

export type WallStyle = "neon" | "led" | "brick" | "stone" | "glass" | "garden" | "paint";

export interface StreetStyle {
  wall: WallStyle;
  colors: string[]; // wall base colors (one picked per building)
  trim: string; // mullions / cornices / balcony lines
  depth: [number, number]; // building length along the street (m)
  alley: [number, number]; // gap between buildings (m)
  heightScale: number; // multiply facade height for the side wall
}

interface VehicleDef {
  type: VehicleType;
  body: string;
  accent?: string;
  label?: string;
  len?: number;
}

interface CityRecipe {
  block: VehicleDef[];
  moving: VehicleDef[];
  long: VehicleDef[];
  low: { type: LowType; accent: string; accent2?: string }[];
  overhead: { type: OverheadType; accent: string; label: string; accent2?: string }[];
  props: { type: PropType; offset: number; spacing: number; sides?: "both" | "left" | "right"; variants?: number }[];
  ambience: Ambience;
  buildingGap: number;
  street: StreetStyle;
}

const DEFAULT_LEN: Partial<Record<VehicleType, number>> = {
  car: 4.4,
  taxi: 4.6,
  cab: 4.5,
  supercar: 4.6,
  suv: 4.9,
  van: 5.2,
  truck: 8,
  bus: 11.5,
  doubledecker: 10.5,
  danfo: 5.2,
  keke: 2.8,
  train: 36,
  tram: 28,
  scooter: 1.9,
  digger: 5,
};

const RECIPES: Record<CityId, CityRecipe> = {
  tokyo: {
    block: [
      { type: "van", body: "#e8ecf5", accent: "#ff2bd6", label: "宅配便" },
      { type: "truck", body: "#2a2f45", accent: "#59f3ff", label: "METAWIN" },
      { type: "digger", body: "#ffb000" },
    ],
    moving: [
      { type: "car", body: "#5b1270", accent: "#ff2bd6" },
      { type: "van", body: "#e8ecf5", accent: "#59f3ff" },
    ],
    long: [{ type: "train", body: "#e8ecf5", accent: "#ff2bd6", label: "東京 RUSH LINE" }],
    low: [
      { type: "jersey", accent: "#ff2bd6", accent2: "#1a0f2a" },
      { type: "cones", accent: "#ff8a3d" },
    ],
    overhead: [
      { type: "gate", accent: "#ff2bd6", label: "メタウィン" },
      { type: "scaffold", accent: "#ffcf3d", label: "工事中" },
    ],
    props: [
      { type: "lamp", offset: 0.6, spacing: 22, variants: 3 },
      { type: "vending", offset: 1.4, spacing: 34, variants: 4 },
      { type: "billboard", offset: 2.2, spacing: 90, variants: 3 },
    ],
    ambience: "rain",
    buildingGap: 4.2,
    street: { wall: "neon", colors: ["#1b1230", "#141026", "#221538"], trim: "#ff2bd6", depth: [8, 14], alley: [2, 5], heightScale: 1 },
  },
  newyork: {
    block: [
      { type: "taxi", body: "#ffcc00", label: "TAXI" },
      { type: "truck", body: "#d9dde6", accent: "#ff4d4d", label: "DELIVERY" },
      { type: "digger", body: "#ffb000" },
    ],
    moving: [
      { type: "taxi", body: "#ffcc00", label: "TAXI" },
      { type: "suv", body: "#1a1c22", accent: "#4dd2ff" },
    ],
    long: [
      { type: "bus", body: "#2f6bff", accent: "#ffd23f", label: "M42 CROSSTOWN" },
      { type: "truck", body: "#d9dde6", accent: "#ff4d4d", label: "FREIGHT", len: 13 },
    ],
    low: [
      { type: "turnstile", accent: "#3dff9a" },
      { type: "jersey", accent: "#ff8a3d", accent2: "#ffffff" },
    ],
    overhead: [
      { type: "scaffold", accent: "#ffcf3d", label: "HARD HAT AREA" },
      { type: "banner", accent: "#1a3a24", label: "SUBWAY", accent2: "#3dff9a" },
    ],
    props: [
      { type: "lamp", offset: 0.6, spacing: 24 },
      { type: "hydrant", offset: 0.5, spacing: 40 },
      { type: "subway", offset: 1.6, spacing: 70, sides: "left" },
      { type: "trafficlight", offset: 0.4, spacing: 80, variants: 3 },
      { type: "billboard", offset: 2.2, spacing: 110, variants: 3 },
    ],
    ambience: "steam",
    buildingGap: 4.5,
    street: { wall: "brick", colors: ["#5a2e24", "#4a2a22", "#6b6a6e", "#3e3d44"], trim: "#c9b48a", depth: [12, 20], alley: [1, 3], heightScale: 1 },
  },
  dubai: {
    block: [
      { type: "supercar", body: "#e0b13a", accent: "#59f3ff" },
      { type: "suv", body: "#f2f2f2", accent: "#ffcf6e" },
      { type: "digger", body: "#ffb000" },
    ],
    moving: [
      { type: "supercar", body: "#c4122f", accent: "#ffcf6e" },
      { type: "supercar", body: "#16141a", accent: "#59f3ff" },
    ],
    long: [{ type: "tram", body: "#e9eef8", accent: "#ffcf6e", label: "DUBAI TRAM" }],
    low: [
      { type: "jersey", accent: "#ffcf6e", accent2: "#2a2118" },
      { type: "sandbags", accent: "#ff8a3d" },
    ],
    overhead: [
      { type: "gantry", accent: "#ffcf6e", label: "SHEIKH RUSH RD" },
      { type: "scaffold", accent: "#ffcf3d", label: "CONSTRUCTION" },
    ],
    props: [
      { type: "palm", offset: 1.2, spacing: 18 },
      { type: "lamp", offset: 0.5, spacing: 30 },
      { type: "billboard", offset: 2.4, spacing: 100, variants: 2 },
    ],
    ambience: "dust",
    buildingGap: 9,
    street: { wall: "glass", colors: ["#16304a", "#1d3b57", "#2a2a3a"], trim: "#ffcf6e", depth: [14, 22], alley: [16, 34], heightScale: 1 },
  },
  london: {
    block: [
      { type: "cab", body: "#16161c" },
      { type: "van", body: "#d9dde6", accent: "#e3262f", label: "ROYAL RUSH" },
      { type: "digger", body: "#ffb000" },
    ],
    moving: [
      { type: "cab", body: "#16161c" },
      { type: "doubledecker", body: "#d0121c", accent: "#ffb347", len: 10.5 },
    ],
    long: [{ type: "doubledecker", body: "#d0121c", accent: "#ffb347", label: "73  OXFORD CIRCUS" }],
    low: [
      { type: "stripe", accent: "#e3262f" },
      { type: "turnstile", accent: "#2f6bff" },
    ],
    overhead: [
      { type: "scaffold", accent: "#ffcf3d", label: "MIND THE GAP" },
      { type: "banner", accent: "#1f3a9e", label: "UNDERGROUND", accent2: "#e3262f" },
    ],
    props: [
      { type: "lamp", offset: 0.6, spacing: 22 },
      { type: "phonebox", offset: 1.0, spacing: 60 },
      { type: "tree", offset: 1.8, spacing: 46 },
      { type: "billboard", offset: 2.2, spacing: 120, variants: 2 },
    ],
    ambience: "mist",
    buildingGap: 4.2,
    street: { wall: "brick", colors: ["#6a3a2a", "#5a3224", "#7a4a36"], trim: "#f2efe6", depth: [10, 16], alley: [1, 4], heightScale: 1 },
  },
  lagos: {
    block: [
      { type: "danfo", body: "#ffcf1a", label: "OSHODI · CMS" },
      { type: "keke", body: "#ffcf1a" },
      { type: "digger", body: "#ffb000" },
    ],
    moving: [
      { type: "danfo", body: "#ffcf1a", label: "OBALENDE" },
      { type: "car", body: "#13a35a", accent: "#ffdd00" },
    ],
    long: [{ type: "bus", body: "#1f5aa8", accent: "#ffdd00", label: "BRT  CMS - IKORODU" }],
    low: [
      { type: "jersey", accent: "#13a35a", accent2: "#ffffff" },
      { type: "cones", accent: "#ff7a1a" },
    ],
    overhead: [
      { type: "banner", accent: "#13a35a", label: "EKO RUSH", accent2: "#ffdd00" },
      { type: "scaffold", accent: "#ffcf3d", label: "ROAD WORKS" },
    ],
    props: [
      { type: "palm", offset: 1.4, spacing: 20 },
      { type: "lamp", offset: 0.5, spacing: 26 },
      { type: "kiosk", offset: 1.2, spacing: 44, variants: 3 },
      { type: "billboard", offset: 2.4, spacing: 70, variants: 3 },
    ],
    ambience: "embers",
    buildingGap: 5,
    street: { wall: "paint", colors: ["#c98a2e", "#2a8a78", "#b84a30", "#c9b85a", "#4a78b8", "#d8d2c4"], trim: "#1a1a1a", depth: [8, 13], alley: [3, 8], heightScale: 1 },
  },
  paris: {
    block: [
      { type: "car", body: "#2f4bff", accent: "#ffc0e0" },
      { type: "van", body: "#f5f0e6", accent: "#c25a8e", label: "LA POSTE RUSH" },
    ],
    moving: [
      { type: "car", body: "#c4122f", accent: "#ffd98a" },
      { type: "scooter", body: "#ffc0e0", accent: "#2f4bff", label: "VITE" },
    ],
    long: [{ type: "tram", body: "#f5f0e6", accent: "#2f4bff", label: "T3 · PORTE DORÉE" }],
    low: [
      { type: "planter", accent: "#ffc0e0" },
      { type: "stripe", accent: "#e3262f" },
    ],
    overhead: [
      { type: "awning", accent: "#a3192d", label: "CAFÉ METAWIN", accent2: "#f2ead8" },
      { type: "scaffold", accent: "#ffcf3d", label: "TRAVAUX" },
    ],
    props: [
      { type: "lamp", offset: 0.6, spacing: 20 },
      { type: "tree", offset: 1.6, spacing: 26 },
      { type: "bench", offset: 0.8, spacing: 50 },
      { type: "billboard", offset: 2.2, spacing: 120, variants: 2 },
    ],
    ambience: "sparkle",
    buildingGap: 4.2,
    street: { wall: "stone", colors: ["#b8aa88", "#c4b694", "#a89a78"], trim: "#3a4250", depth: [12, 18], alley: [0.5, 2], heightScale: 1 },
  },
  seoul: {
    block: [
      { type: "scooter", body: "#ff3d7f", accent: "#59f3ff", label: "배달" },
      { type: "van", body: "#e9eef8", accent: "#7a5cff", label: "택배" },
      { type: "digger", body: "#ffb000" },
    ],
    moving: [
      { type: "scooter", body: "#59f3ff", accent: "#ff3d7f", label: "퀵" },
      { type: "car", body: "#7a5cff", accent: "#59f3ff" },
    ],
    long: [{ type: "train", body: "#e9eef8", accent: "#59f3ff", label: "KTX RUSH 서울" }],
    low: [
      { type: "stripe", accent: "#ff3d7f" },
      { type: "jersey", accent: "#59f3ff", accent2: "#0d1830" },
    ],
    overhead: [
      { type: "gantry", accent: "#59f3ff", label: "강남대로  GANGNAM", accent2: "#ff3d7f" },
      { type: "gate", accent: "#c6ff3d", label: "메타윈 러시" },
    ],
    props: [
      { type: "lamp", offset: 0.6, spacing: 22, variants: 3 },
      { type: "billboard", offset: 2.2, spacing: 70, variants: 4 },
      { type: "trafficlight", offset: 0.4, spacing: 90, variants: 3 },
    ],
    ambience: "pixels",
    buildingGap: 4.4,
    street: { wall: "led", colors: ["#0b1630", "#0d1a38", "#101a2c"], trim: "#59f3ff", depth: [12, 18], alley: [2, 5], heightScale: 1 },
  },
  singapore: {
    block: [
      { type: "car", body: "#e9eef8", accent: "#7dffb2" },
      { type: "suv", body: "#1f6a5e", accent: "#7dffb2" },
      { type: "digger", body: "#ffb000" },
    ],
    moving: [
      { type: "car", body: "#ff5ad8", accent: "#7dffb2" },
      { type: "suv", body: "#e9eef8", accent: "#59f3ff" },
    ],
    long: [{ type: "train", body: "#e9eef8", accent: "#7dffb2", label: "MRT  MARINA LINE" }],
    low: [
      { type: "planter", accent: "#7dffb2" },
      { type: "jersey", accent: "#ff5ad8", accent2: "#ffffff" },
    ],
    overhead: [
      { type: "gantry", accent: "#7dffb2", label: "ERP  $0.00", accent2: "#ff5ad8" },
      { type: "scaffold", accent: "#ffcf3d", label: "WORK AHEAD" },
    ],
    props: [
      { type: "tree", offset: 1.4, spacing: 24 },
      { type: "supertree", offset: 6, spacing: 70, variants: 2 },
      { type: "lamp", offset: 0.5, spacing: 28 },
      { type: "billboard", offset: 2.4, spacing: 110, variants: 2 },
    ],
    ambience: "fireflies",
    buildingGap: 7,
    street: { wall: "garden", colors: ["#d8e4de", "#c3d1cb", "#e8efe9"], trim: "#2fb865", depth: [14, 20], alley: [10, 24], heightScale: 1 },
  },
};

function vehicleArt(v: VehicleDef, view: "rear" | "front", forceLen?: number): ObstacleArt {
  const [w, h] = VEHICLE_DIMS[v.type];
  const len = forceLen ?? v.len ?? DEFAULT_LEN[v.type] ?? 4.5;
  const isRail = v.type === "train" || v.type === "tram";
  return {
    canvas: paintVehicle({ type: v.type, body: v.body, accent: v.accent, label: v.label, view }),
    w,
    h,
    len,
    box: true,
    sideColor: shade(v.body, -0.35),
    roofColor: shade(v.body, -0.15),
    stripe: isRail || v.type === "bus" || v.type === "doubledecker" ? v.accent ?? "#59f3ff" : undefined,
    collideH: h,
    superJumpable: h <= 3.2,
  };
}

const kitCache = new Map<CityId, CityKit>();

export function buildCityKit(id: CityId): CityKit {
  const cached = kitCache.get(id);
  if (cached) return cached;
  const city = getCity(id);
  const r = RECIPES[id];
  const art: Record<ObstacleKind, ObstacleArt[]> = {
    block: r.block.map((v) => vehicleArt(v, "rear")),
    moving: r.moving.map((v) => vehicleArt(v, "front")),
    long: r.long.map((v) => vehicleArt(v, v.type === "train" || v.type === "tram" ? "front" : "rear")),
    low: r.low.map((l) => {
      const [w, h] = LOW_DIMS[l.type];
      return { canvas: paintLow(l.type, l.accent, l.accent2), w, h, len: 0.7, box: false, sideColor: "#555", roofColor: "#777", collideH: h * 0.92 };
    }),
    overhead: r.overhead.map((o) => {
      const top = OVERHEAD_H[o.type];
      return {
        canvas: paintOverhead(o.type, o.accent, o.label, o.accent2),
        w: OVERHEAD_W,
        h: top,
        len: 0.6,
        box: false,
        sideColor: "#333",
        roofColor: "#444",
        collideH: OVERHEAD_BEAM_BOTTOM,
        top,
      };
    }),
  };
  const catalog: Catalog = {
    block: art.block.map((a) => ({ len: a.len, h: a.collideH, superJumpable: a.superJumpable })),
    moving: art.moving.map((a) => ({ len: a.len, h: a.collideH })),
    long: art.long.map((a) => ({ len: a.len, h: a.collideH })),
    low: art.low.map((a) => ({ len: a.len, h: a.collideH })),
    overhead: art.overhead.map((a) => ({ len: a.len, h: a.collideH, top: a.top })),
  };
  const props: PropSpec[] = [];
  for (const p of r.props) {
    const n = p.variants ?? 1;
    for (let v = 0; v < n; v++) props.push({ tex: paintProp(p.type, city, v), offset: p.offset, spacing: p.spacing * n, sides: p.sides ?? "both" });
  }
  const kit: CityKit = {
    city,
    art,
    catalog,
    buildings: paintBuildings(city, 7),
    props,
    coin: paintCoin(city),
    sky: paintSky(city),
    skylineFar: paintSkylineFar(city),
    skylineNear: paintSkylineNear(city),
    ambience: r.ambience,
    buildingGap: r.buildingGap,
    street: r.street,
  };
  kitCache.set(id, kit);
  return kit;
}

/** Drop cached kits for other cities so only the selected city's art stays in memory. */
export function releaseOtherKits(keep: CityId) {
  for (const k of [...kitCache.keys()]) if (k !== keep) kitCache.delete(k);
}
