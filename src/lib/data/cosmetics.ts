// Cosmetic catalog: characters, helmets, trails, jump/slide effects and intro animations.
// Prices are in META Coins (in-game currency only — no real-money purchases).

export type ItemSlot = "character" | "helmet" | "trail" | "jumpfx" | "slidefx" | "emote";

export interface CharacterLook {
  helmet: [string, string, string]; // highlight, base, shadow
  visor: string;
  glow: string; // emblem / visor symbol glow
  jacket: [string, string]; // base, shadow
  trim: string; // lapel / piping
  vest: string;
  pants: string;
  boots: string;
  accent: string; // straps, buckles
}

export interface CosmeticItem {
  id: string;
  slot: ItemSlot;
  name: string;
  description: string;
  price: number; // 0 = not purchasable with coins (default, level or reward unlock)
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  unlockLevel?: number; // automatically granted at this level
  rewardOnly?: boolean; // only from daily rewards / events
  look?: CharacterLook; // characters only
  color?: string; // primary color for fx / trails / previews
  color2?: string;
}

const ORIGINAL: CharacterLook = {
  helmet: ["#ffffff", "#c9ced8", "#6b7280"],
  visor: "#05060a",
  glow: "#38e8ff",
  jacket: ["#8b3fd6", "#4b1c86"],
  trim: "#c58cff",
  vest: "#1f7a4d",
  pants: "#191926",
  boots: "#2a2a3a",
  accent: "#9aa3b5",
};

export const COSMETICS: CosmeticItem[] = [
  // ── Characters ──────────────────────────────────────────────────────────
  {
    id: "char_masked",
    slot: "character",
    name: "The Masked One",
    description: "The original Metawin runner. Silver helm, black visor, violet coat.",
    price: 0,
    rarity: "Legendary",
    look: ORIGINAL,
  },
  {
    id: "char_cyan",
    slot: "character",
    name: "Cyan Phantom",
    description: "Stealth-black armor with an electric cyan core.",
    price: 1500,
    rarity: "Rare",
    look: {
      helmet: ["#d8f9ff", "#7f9aa6", "#2b3a44"],
      visor: "#020409",
      glow: "#59f3ff",
      jacket: ["#16212c", "#0a1016"],
      trim: "#59f3ff",
      vest: "#0f3b4a",
      pants: "#0c1218",
      boots: "#1a2630",
      accent: "#59f3ff",
    },
  },
  {
    id: "char_crimson",
    slot: "character",
    name: "Crimson Rider",
    description: "Red lacquer helm and a coat cut for speed.",
    price: 2000,
    rarity: "Rare",
    look: {
      helmet: ["#ffd0d0", "#d8323c", "#6e0f16"],
      visor: "#08030a",
      glow: "#ff4d6a",
      jacket: ["#2a1218", "#14070b"],
      trim: "#ff4d6a",
      vest: "#5a0f1c",
      pants: "#1a0d10",
      boots: "#2a1418",
      accent: "#ffb1bd",
    },
  },
  {
    id: "char_emerald",
    slot: "character",
    name: "Emerald Ghost",
    description: "Jade plating and a glow you can only see when it's too late.",
    price: 2500,
    rarity: "Rare",
    look: {
      helmet: ["#e6fff1", "#8fd6ad", "#2c6b4a"],
      visor: "#020805",
      glow: "#3dff9a",
      jacket: ["#0f3324", "#071a12"],
      trim: "#3dff9a",
      vest: "#5b2a8c",
      pants: "#0b1a14",
      boots: "#14281f",
      accent: "#a6ffd1",
    },
  },
  {
    id: "char_frost",
    slot: "character",
    name: "Frostbyte",
    description: "White ceramic armor that leaves frost on the asphalt.",
    price: 3000,
    rarity: "Epic",
    look: {
      helmet: ["#ffffff", "#e8f2ff", "#9db3cf"],
      visor: "#06101c",
      glow: "#9fd8ff",
      jacket: ["#e9f1fb", "#a9bcd6"],
      trim: "#59b8ff",
      vest: "#2f5f9a",
      pants: "#c9d6e8",
      boots: "#6f86a6",
      accent: "#59b8ff",
    },
  },
  {
    id: "char_eko",
    slot: "character",
    name: "Eko Lion",
    description: "Lagos-born legend in green and white with a golden mane crest.",
    price: 3500,
    rarity: "Epic",
    look: {
      helmet: ["#ffffff", "#e6e9ee", "#8f97a3"],
      visor: "#040805",
      glow: "#ffd23f",
      jacket: ["#0e8f4c", "#06552c"],
      trim: "#ffffff",
      vest: "#ffd23f",
      pants: "#0b2a19",
      boots: "#1a2a20",
      accent: "#ffd23f",
    },
  },
  {
    id: "char_gold",
    slot: "character",
    name: "Gold Baron",
    description: "Polished gold helm and a black tuxedo. Dubai approved.",
    price: 4000,
    rarity: "Epic",
    look: {
      helmet: ["#fff3c4", "#e0b13a", "#7a5410"],
      visor: "#070502",
      glow: "#ffd76e",
      jacket: ["#16141a", "#08070a"],
      trim: "#e0b13a",
      vest: "#3b2a0b",
      pants: "#0d0c10",
      boots: "#1d1a14",
      accent: "#e0b13a",
    },
  },
  {
    id: "char_shogun",
    slot: "character",
    name: "Neon Shogun",
    description: "Tokyo street samurai. Magenta armor, horned crest, zero hesitation.",
    price: 5000,
    rarity: "Legendary",
    look: {
      helmet: ["#ffd1f5", "#c23ca8", "#4f0f45"],
      visor: "#06020a",
      glow: "#ff2bd6",
      jacket: ["#1e0b2a", "#0e0515"],
      trim: "#ff2bd6",
      vest: "#59f3ff",
      pants: "#14081c",
      boots: "#2a1036",
      accent: "#ff2bd6",
    },
  },
  {
    id: "char_void",
    slot: "character",
    name: "Void Walker",
    description: "Reach level 15. A shadow with a violet heartbeat.",
    price: 0,
    rarity: "Legendary",
    unlockLevel: 15,
    look: {
      helmet: ["#6b6b80", "#26262f", "#0a0a0f"],
      visor: "#000000",
      glow: "#b44dff",
      jacket: ["#120a1c", "#06030b"],
      trim: "#b44dff",
      vest: "#2a0f45",
      pants: "#07060b",
      boots: "#140f1c",
      accent: "#b44dff",
    },
  },

  // ── Helmets ─────────────────────────────────────────────────────────────
  { id: "helm_standard", slot: "helmet", name: "Standard Helm", description: "The classic smooth Metawin helm.", price: 0, rarity: "Common" },
  { id: "helm_antenna", slot: "helmet", name: "Signal Antenna", description: "Twin antennas with blinking tips.", price: 900, rarity: "Common", color: "#59f3ff" },
  { id: "helm_crest", slot: "helmet", name: "Mohawk Crest", description: "A glowing blade crest from brow to neck.", price: 1200, rarity: "Rare", color: "#ff2bd6" },
  { id: "helm_horns", slot: "helmet", name: "Oni Horns", description: "Chrome horns for runners who mean it.", price: 1800, rarity: "Epic", color: "#e8ecf5" },
  { id: "helm_halo", slot: "helmet", name: "Neon Halo", description: "Day 7 login reward. A floating ring of light.", price: 0, rarity: "Legendary", rewardOnly: true, color: "#ffe14d" },

  // ── Trails ──────────────────────────────────────────────────────────────
  { id: "trail_none", slot: "trail", name: "No Trail", description: "Clean and quiet.", price: 0, rarity: "Common" },
  { id: "trail_cyan", slot: "trail", name: "Cyan Stream", description: "Unlocked at level 5.", price: 0, rarity: "Common", unlockLevel: 5, color: "#59f3ff", color2: "#1a8ea3" },
  { id: "trail_purple", slot: "trail", name: "Violet Flame", description: "Metawin purple fire.", price: 1200, rarity: "Rare", color: "#b44dff", color2: "#ff2bd6" },
  { id: "trail_matrix", slot: "trail", name: "Data Stream", description: "Falling green code.", price: 1800, rarity: "Rare", color: "#3dff9a", color2: "#0e8f4c" },
  { id: "trail_gold", slot: "trail", name: "Gold Rush", description: "Leave a wake of gold sparks.", price: 2500, rarity: "Epic", color: "#ffd23f", color2: "#ff8a3d" },
  { id: "trail_rainbow", slot: "trail", name: "Prism", description: "Unlocked at level 10.", price: 0, rarity: "Legendary", unlockLevel: 10, color: "#ff2bd6", color2: "#59f3ff" },

  // ── Jump effects ────────────────────────────────────────────────────────
  { id: "jfx_none", slot: "jumpfx", name: "Standard Jump", description: "No extra effect.", price: 0, rarity: "Common" },
  { id: "jfx_shockwave", slot: "jumpfx", name: "Shockwave", description: "A ring of energy on take-off.", price: 700, rarity: "Common", color: "#59f3ff" },
  { id: "jfx_starburst", slot: "jumpfx", name: "Starburst", description: "Sparks explode beneath you.", price: 1100, rarity: "Rare", color: "#ffe14d" },
  { id: "jfx_lightning", slot: "jumpfx", name: "Lightning", description: "Electric arcs crackle on every jump.", price: 1600, rarity: "Epic", color: "#b44dff" },

  // ── Slide effects ───────────────────────────────────────────────────────
  { id: "sfx_none", slot: "slidefx", name: "Standard Slide", description: "No extra effect.", price: 0, rarity: "Common" },
  { id: "sfx_sparks", slot: "slidefx", name: "Sparks", description: "Metal-on-asphalt sparks.", price: 700, rarity: "Common", color: "#ffb347" },
  { id: "sfx_neon", slot: "slidefx", name: "Neon Streak", description: "A pink light streak along the road.", price: 1100, rarity: "Rare", color: "#ff2bd6" },
  { id: "sfx_ice", slot: "slidefx", name: "Ice Mist", description: "A cold mist trail.", price: 1400, rarity: "Epic", color: "#9fd8ff" },

  // ── Special animations (played on run start) ────────────────────────────
  { id: "emote_none", slot: "emote", name: "Quick Start", description: "Straight into the run.", price: 0, rarity: "Common" },
  { id: "emote_pose", slot: "emote", name: "Power Pose", description: "A confident pulse before you go.", price: 1000, rarity: "Common", color: "#59f3ff" },
  { id: "emote_spin", slot: "emote", name: "Spin Start", description: "A full spin into the first stride.", price: 1500, rarity: "Rare", color: "#ff2bd6" },
  { id: "emote_flip", slot: "emote", name: "Backflip Launch", description: "Land a backflip, then run.", price: 2200, rarity: "Epic", color: "#ffe14d" },
];

export const DEFAULT_EQUIPPED: Record<ItemSlot, string> = {
  character: "char_masked",
  helmet: "helm_standard",
  trail: "trail_none",
  jumpfx: "jfx_none",
  slidefx: "sfx_none",
  emote: "emote_none",
};

export const DEFAULT_INVENTORY = Object.values(DEFAULT_EQUIPPED);

export function getItem(id: string): CosmeticItem | undefined {
  return COSMETICS.find((c) => c.id === id);
}

export function getLook(characterId: string): CharacterLook {
  return getItem(characterId)?.look ?? ORIGINAL;
}

export const SLOT_LABELS: Record<ItemSlot, string> = {
  character: "Characters",
  helmet: "Helmets",
  trail: "Trails",
  jumpfx: "Jump FX",
  slidefx: "Slide FX",
  emote: "Animations",
};
