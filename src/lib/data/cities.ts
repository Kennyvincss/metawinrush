// City catalog — the single source of truth used by the game, the UI and the server.

export type CityId =
  | "tokyo"
  | "newyork"
  | "dubai"
  | "london"
  | "lagos"
  | "paris"
  | "seoul"
  | "singapore";

export type UnlockRule =
  | { type: "free" }
  | { type: "score"; value: number } // best single-run score
  | { type: "level"; value: number } // player level
  | { type: "missions"; value: number } // lifetime missions completed
  | { type: "coins"; value: number }; // pay META Coins to unlock

export interface CityPalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  horizonGlow: string;
  fog: string;
  ground: string;
  road: string;
  roadAlt: string;
  laneLine: string;
  rumbleA: string;
  rumbleB: string;
  sidewalk: string;
  neon: string[];
  windowLit: string[];
}

export interface CityDifficulty {
  baseSpeed: number; // m/s at start
  maxSpeed: number; // m/s cap
  ramp: number; // meters until ~63% of the way from base to max speed
  minRowGap: number; // seconds of reaction time between obstacle rows at max difficulty
  movingChance: number; // probability a row contains oncoming traffic
  doubleBlockChance: number; // probability a row blocks two lanes
}

export interface CityDef {
  id: CityId;
  name: string;
  country: string;
  theme: string;
  tagline: string;
  description: string;
  unlock: UnlockRule;
  palette: CityPalette;
  difficulty: CityDifficulty;
  coin: { face: string; rim: string; glow: string; symbol: "mw" | "yen" | "star" | "crown" | "rose" | "leaf" | "diamond" | "wave" };
  musicLabel: string;
  difficultyLabel: "Easy" | "Medium" | "Hard" | "Extreme";
}

export const CITIES: CityDef[] = [
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    theme: "Neon Cyberpunk",
    tagline: "Neon never sleeps",
    description: "Holographic billboards, maglev trains and rain-slick streets under a violet sky.",
    unlock: { type: "free" },
    palette: {
      skyTop: "#05010f",
      skyMid: "#1a0638",
      skyBottom: "#5b1270",
      horizonGlow: "#ff2bd6",
      fog: "#3a0a52",
      ground: "#0b0716",
      road: "#17131f",
      roadAlt: "#1c1726",
      laneLine: "#59f3ff",
      rumbleA: "#ff2bd6",
      rumbleB: "#1b0f2a",
      sidewalk: "#231a33",
      neon: ["#ff2bd6", "#59f3ff", "#b44dff", "#ffe14d"],
      windowLit: ["#ff7ae6", "#7af4ff", "#c79bff"],
    },
    difficulty: { baseSpeed: 17, maxSpeed: 38, ramp: 4800, minRowGap: 0.85, movingChance: 0.1, doubleBlockChance: 0.35 },
    coin: { face: "#c9b8ff", rim: "#7a3cff", glow: "#b44dff", symbol: "mw" },
    musicLabel: "Synthwave Nights · 124 BPM",
    difficultyLabel: "Easy",
  },
  {
    id: "newyork",
    name: "New York",
    country: "USA",
    theme: "Modern Urban",
    tagline: "The city that never stops",
    description: "Canyons of steel, yellow cabs and screens brighter than daylight.",
    unlock: { type: "score", value: 5000 },
    palette: {
      skyTop: "#020611",
      skyMid: "#0b1a3a",
      skyBottom: "#2a3f74",
      horizonGlow: "#ffb347",
      fog: "#1d2a4d",
      ground: "#0b0e16",
      road: "#1a1c22",
      roadAlt: "#1f2128",
      laneLine: "#ffd23f",
      rumbleA: "#ffd23f",
      rumbleB: "#20232b",
      sidewalk: "#2b2e36",
      neon: ["#ffd23f", "#ff4d4d", "#4dd2ff", "#ffffff"],
      windowLit: ["#ffd98a", "#fff1c9", "#9fd4ff"],
    },
    difficulty: { baseSpeed: 18, maxSpeed: 40, ramp: 4400, minRowGap: 0.8, movingChance: 0.22, doubleBlockChance: 0.4 },
    coin: { face: "#ffe58a", rim: "#d39a00", glow: "#ffd23f", symbol: "star" },
    musicLabel: "Boom Bap Avenue · 96 BPM",
    difficultyLabel: "Medium",
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    theme: "Luxury Futurism",
    tagline: "Built to the sky",
    description: "Supertall towers, golden highways and supercars racing across the desert night.",
    unlock: { type: "coins", value: 2500 },
    palette: {
      skyTop: "#04040f",
      skyMid: "#1c1238",
      skyBottom: "#8a4a2a",
      horizonGlow: "#ffb35c",
      fog: "#3a2a3a",
      ground: "#1a120b",
      road: "#1b1a1f",
      roadAlt: "#211f25",
      laneLine: "#ffcf6e",
      rumbleA: "#ffcf6e",
      rumbleB: "#2a2118",
      sidewalk: "#3b2f24",
      neon: ["#ffcf6e", "#59f3ff", "#ff8a3d", "#ffffff"],
      windowLit: ["#ffe2a6", "#ffd17a", "#bdf6ff"],
    },
    difficulty: { baseSpeed: 19, maxSpeed: 41, ramp: 4200, minRowGap: 0.8, movingChance: 0.28, doubleBlockChance: 0.4 },
    coin: { face: "#ffe7a0", rim: "#c08a1e", glow: "#ffcf6e", symbol: "diamond" },
    musicLabel: "Desert Gold · 110 BPM",
    difficultyLabel: "Medium",
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    theme: "Futuristic European",
    tagline: "Mind the gap",
    description: "Clock towers, red double-deckers and Underground roundels glowing through the mist.",
    unlock: { type: "missions", value: 5 },
    palette: {
      skyTop: "#03050b",
      skyMid: "#111a2b",
      skyBottom: "#33405a",
      horizonGlow: "#8fb7ff",
      fog: "#2a3346",
      ground: "#0d1016",
      road: "#1b1d23",
      roadAlt: "#202229",
      laneLine: "#e8ecf5",
      rumbleA: "#e3262f",
      rumbleB: "#e8ecf5",
      sidewalk: "#2c3039",
      neon: ["#e3262f", "#2f6bff", "#ffffff", "#59f3ff"],
      windowLit: ["#ffe6b0", "#dfe8ff", "#ffcf8a"],
    },
    difficulty: { baseSpeed: 18, maxSpeed: 40, ramp: 4400, minRowGap: 0.8, movingChance: 0.2, doubleBlockChance: 0.45 },
    coin: { face: "#e9eef8", rim: "#8d99b3", glow: "#8fb7ff", symbol: "crown" },
    musicLabel: "Underground Garage · 132 BPM",
    difficultyLabel: "Medium",
  },
  {
    id: "lagos",
    name: "Lagos",
    country: "Nigeria",
    theme: "African Urban Energy",
    tagline: "Eko o ni baje",
    description: "Danfo buses, the long bridge over the lagoon, palms and waterfront lights — loud, bright and alive.",
    unlock: { type: "level", value: 3 },
    palette: {
      skyTop: "#030812",
      skyMid: "#0d2440",
      skyBottom: "#c4572a",
      horizonGlow: "#ffb02e",
      fog: "#3a2a2a",
      ground: "#0d140f",
      road: "#1e1c1a",
      roadAlt: "#24211e",
      laneLine: "#ffdd00",
      rumbleA: "#13a35a",
      rumbleB: "#f2f2f2",
      sidewalk: "#3a3128",
      neon: ["#13d36f", "#ffdd00", "#ff7a1a", "#b44dff"],
      windowLit: ["#ffd27a", "#b8ffcf", "#ffe9b0"],
    },
    difficulty: { baseSpeed: 19, maxSpeed: 42, ramp: 3900, minRowGap: 0.78, movingChance: 0.3, doubleBlockChance: 0.45 },
    coin: { face: "#b8ffd6", rim: "#0e8f4c", glow: "#13d36f", symbol: "wave" },
    musicLabel: "Afro Rush · 112 BPM",
    difficultyLabel: "Hard",
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    theme: "European Elegance",
    tagline: "La ville lumière",
    description: "Haussmann boulevards, glowing cafés and the iron tower sparkling on the hour.",
    unlock: { type: "score", value: 25000 },
    palette: {
      skyTop: "#04030c",
      skyMid: "#1a1336",
      skyBottom: "#5a3c6e",
      horizonGlow: "#ffc0e0",
      fog: "#3a2c4a",
      ground: "#100d14",
      road: "#1d1a20",
      roadAlt: "#232026",
      laneLine: "#ffe9c4",
      rumbleA: "#2f4bff",
      rumbleB: "#f5f0e6",
      sidewalk: "#3a3240",
      neon: ["#ffc0e0", "#ffd98a", "#7aa2ff", "#ffffff"],
      windowLit: ["#ffdca0", "#ffe9c4", "#ffc0e0"],
    },
    difficulty: { baseSpeed: 20, maxSpeed: 42, ramp: 3700, minRowGap: 0.76, movingChance: 0.25, doubleBlockChance: 0.5 },
    coin: { face: "#ffd6ea", rim: "#c25a8e", glow: "#ffc0e0", symbol: "rose" },
    musicLabel: "French Filter House · 122 BPM",
    difficultyLabel: "Hard",
  },
  {
    id: "seoul",
    name: "Seoul",
    country: "South Korea",
    theme: "Advanced Cyberpunk",
    tagline: "Faster than the future",
    description: "Wall-to-wall LED screens, bullet trains and delivery scooters weaving through Gangnam light.",
    unlock: { type: "level", value: 8 },
    palette: {
      skyTop: "#01030c",
      skyMid: "#071a3a",
      skyBottom: "#0f5a8a",
      horizonGlow: "#59f3ff",
      fog: "#0d2a44",
      ground: "#060b14",
      road: "#141820",
      roadAlt: "#191d26",
      laneLine: "#59f3ff",
      rumbleA: "#59f3ff",
      rumbleB: "#ff3d7f",
      sidewalk: "#1d2433",
      neon: ["#59f3ff", "#ff3d7f", "#7a5cff", "#c6ff3d"],
      windowLit: ["#8af7ff", "#ff8ab5", "#b9a6ff"],
    },
    difficulty: { baseSpeed: 21, maxSpeed: 44, ramp: 3400, minRowGap: 0.72, movingChance: 0.32, doubleBlockChance: 0.5 },
    coin: { face: "#bff9ff", rim: "#1a8ea3", glow: "#59f3ff", symbol: "mw" },
    musicLabel: "K-Rush EDM · 128 BPM",
    difficultyLabel: "Extreme",
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    theme: "Futuristic Green City",
    tagline: "Garden of the future",
    description: "Glowing supertrees, sky-parks on stilts and spotless highways under gantry lights.",
    unlock: { type: "coins", value: 6000 },
    palette: {
      skyTop: "#020a0c",
      skyMid: "#06242a",
      skyBottom: "#1f6a5e",
      horizonGlow: "#7dffb2",
      fog: "#123a36",
      ground: "#06120f",
      road: "#161b1c",
      roadAlt: "#1b2122",
      laneLine: "#d8fff0",
      rumbleA: "#7dffb2",
      rumbleB: "#1d2b2a",
      sidewalk: "#20302d",
      neon: ["#7dffb2", "#ff5ad8", "#59f3ff", "#ffe14d"],
      windowLit: ["#d8fff0", "#9effd0", "#fff2b8"],
    },
    difficulty: { baseSpeed: 21, maxSpeed: 44, ramp: 3200, minRowGap: 0.7, movingChance: 0.3, doubleBlockChance: 0.55 },
    coin: { face: "#c8ffe2", rim: "#1f9a66", glow: "#7dffb2", symbol: "leaf" },
    musicLabel: "Garden Future Garage · 118 BPM",
    difficultyLabel: "Extreme",
  },
];

export const CITY_IDS = CITIES.map((c) => c.id);

export function getCity(id: string): CityDef {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}

export function isCityId(id: unknown): id is CityId {
  return typeof id === "string" && (CITY_IDS as string[]).includes(id);
}

export function describeUnlock(rule: UnlockRule): string {
  switch (rule.type) {
    case "free":
      return "Unlocked";
    case "score":
      return `Score ${rule.value.toLocaleString()} in a single run`;
    case "level":
      return `Reach player level ${rule.value}`;
    case "missions":
      return `Complete ${rule.value} missions`;
    case "coins":
      return `Unlock for ${rule.value.toLocaleString()} META Coins`;
  }
}
