/**
 * Stable colors per catalog category so the same group always looks the same.
 * Unknown categories fall back to a hash of the name.
 */

const FALLBACK_PALETTE = [
  "#15803d",
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#c026d3",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#65a30d",
  "#0891b2",
  "#4f46e5",
  "#64748b",
];

/** Explicit mapping for INTABA `categoryFromSku` groups */
const BY_NAME: Record<string, string> = {
  "Maize seed": "#ca8a04",
  "Vegetable seed": "#16a34a",
  Fertilizer: "#0891b2",
  Packaging: "#64748b",
  "Crop protection": "#dc2626",
  "Bio products": "#9333ea",
  Agrochemicals: "#ea580c",
  Equipment: "#4f46e5",
  "Wheat seed": "#b45309",
  "Soya seed": "#84cc16",
  "Oil & grain": "#0d9488",
  Services: "#6b7280",
  General: "#78716c",
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = s.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

/** Border / legend color for a category name */
export function colorForCategory(category: string): string {
  const direct = BY_NAME[category];
  if (direct) return direct;
  return FALLBACK_PALETTE[hashString(category) % FALLBACK_PALETTE.length];
}

/**
 * Per-crop accent color. Roughly hue-aligned to the actual vegetable when
 * possible (Tomato → red, Carrot → orange, Beetroot → magenta), otherwise
 * just chosen to be visually distinct from neighbours.
 */
const BY_VEG_TYPE: Record<string, string> = {
  Beans: "#10b981",
  Beetroot: "#a21caf",
  Broccoli: "#0f766e",
  Cabbage: "#22c55e",
  "Cabbage (Red)": "#7c3aed",
  "Cabbage (White)": "#84cc16",
  Carrot: "#ea580c",
  Cauliflower: "#facc15",
  Cucumber: "#16a34a",
  Kale: "#0891b2",
  Lettuce: "#65a30d",
  Mustard: "#b45309",
  Okra: "#059669",
  Onion: "#eab308",
  Peas: "#15803d",
  Pepper: "#e11d48",
  Pumpkin: "#d97706",
  Rape: "#f59e0b",
  Spinach: "#064e3b",
  Squash: "#ca8a04",
  "Sweet Pepper": "#f97316",
  Sweetcorn: "#a16207",
  Tomato: "#dc2626",
  Watermelon: "#be123c",
  Other: "#78716c",
};

export function colorForVegType(vegType: string): string {
  const direct = BY_VEG_TYPE[vegType];
  if (direct) return direct;
  return FALLBACK_PALETTE[hashString(vegType) % FALLBACK_PALETTE.length];
}
