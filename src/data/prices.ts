/**
 * Active price list — built from the local product catalog in
 * `intaba-products.ts`. Each product carries its own retail price (USD).
 * A price of `0` means the retail price has not been set yet for that pack
 * size and will render as "USD —" in the UI.
 */
import { PRODUCTS, type Product } from "./intaba-products";

export type PriceItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  price: number;
  currency: string;
  category: string;
  /** Crop family inferred from the product name (e.g. "Tomato", "Onion"). */
  vegType: string;
};

const DEFAULT_CURRENCY = "USD";

/** SKU-prefix grouping aligned with INTABA naming (see intaba-products header). */
export function categoryFromSku(sku: string): string {
  const u = sku.toUpperCase();
  if (u.startsWith("MS/")) return "Maize seed";
  if (u.startsWith("VS/")) return "Vegetable seed";
  if (u.startsWith("FN/")) return "Fertilizer";
  if (u.startsWith("PACK")) return "Packaging";
  if (u.startsWith("CP/") || /^CP[A-Z0-9]/i.test(sku)) return "Crop protection";
  if (u.startsWith("CBM/") || u.startsWith("CBS") || /^CB[A-Z]/i.test(sku))
    return "Bio products";
  if (u.startsWith("AG")) return "Agrochemicals";
  if (u.startsWith("OT")) return "Equipment";
  if (u.startsWith("WS/")) return "Wheat seed";
  if (u.startsWith("SB/")) return "Soya seed";
  if (u.startsWith("OG/")) return "Oil & grain";
  if (u.startsWith("SER") || u.includes("SERVICE")) return "Services";
  return "General";
}

/**
 * Map a product description to a canonical crop family for color coding.
 * Order matters: more-specific patterns (e.g. `Sweet Pepper`) come before
 * the generic ones (`Pepper`).
 */
const VEG_TYPE_PATTERNS: { match: RegExp; type: string }[] = [
  { match: /\b(?:Squash|Butternut)\b/i, type: "Squash" },
  { match: /\b(?:Watermelon|Watemelon)\b/i, type: "Watermelon" },
  { match: /\bW\/Cabbage\b/i, type: "Cabbage (White)" },
  { match: /\bR\/Cabbage\b/i, type: "Cabbage (Red)" },
  { match: /\bCauliflower\b/i, type: "Cauliflower" },
  { match: /\bCabbage\b/i, type: "Cabbage" },
  { match: /\bBroccoli\b/i, type: "Broccoli" },
  { match: /\bCucumber\b/i, type: "Cucumber" },
  { match: /\bG\/Beans\b/i, type: "Beans" },
  { match: /\bLettuce\b/i, type: "Lettuce" },
  { match: /\bOkra\b/i, type: "Okra" },
  { match: /\bOnion\b/i, type: "Onion" },
  { match: /\bS\/Pepper\b/i, type: "Sweet Pepper" },
  { match: /\bPepper\b/i, type: "Pepper" },
  { match: /\b(?:S\/Corn|Sweet ?corn)\b/i, type: "Sweetcorn" },
  { match: /\bTomato\b/i, type: "Tomato" },
  { match: /\bBeetroot\b/i, type: "Beetroot" },
  { match: /\bCarrot\b/i, type: "Carrot" },
  { match: /\b(?:Couve|Kale)\b/i, type: "Kale" },
  { match: /\bMustard\b/i, type: "Mustard" },
  { match: /\bPeas\b/i, type: "Peas" },
  { match: /\bPumpkin\b/i, type: "Pumpkin" },
  { match: /\bRape\b/i, type: "Rape" },
  { match: /\bSpinach\b/i, type: "Spinach" },
];

export function vegTypeFromName(name: string): string {
  for (const { match, type } of VEG_TYPE_PATTERNS) {
    if (match.test(name)) return type;
  }
  return "Other";
}

/** Best-effort unit from product name (sizes often appear in the description). */
export function unitFromName(name: string): string {
  const tail = name.match(
    /(\d+(?:\.\d+)?)\s*(KG|G|L|ML|KS)\b/i
  );
  if (tail) {
    const u = tail[2].toUpperCase();
    if (u === "KS") return "unit";
    return u.toLowerCase();
  }
  if (/\bbag\b/i.test(name)) return "bag";
  if (/\bbottle\b/i.test(name)) return "bottle";
  return "unit";
}

function toPriceItem(p: Product, index: number): PriceItem {
  return {
    id: p.sku || `row-${index}`,
    sku: p.sku,
    name: p.name,
    unit: unitFromName(p.name),
    price: p.price,
    currency: DEFAULT_CURRENCY,
    category: categoryFromSku(p.sku),
    vegType: vegTypeFromName(p.name),
  };
}

export const ACTIVE_PRICES: PriceItem[] = PRODUCTS.map(toPriceItem);

/** Bump when you refresh `intaba-products.ts`. */
export const PRICE_LIST_VERSION = "2026-04-29T09:00:00.000Z";

export function formatMoney(amount: number, currency: string): string {
  if (amount === 0) return `${currency} —`;
  return `${currency} ${amount.toFixed(2)}`;
}

export function filterPrices(
  items: PriceItem[],
  query: string,
  category: string | null,
  vegType: string | null = null
): PriceItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    const catOk = !category || item.category === category;
    const vegOk = !vegType || item.vegType === vegType;
    if (!q) return catOk && vegOk;
    const match =
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.vegType.toLowerCase().includes(q);
    return catOk && vegOk && match;
  });
}

export function categoriesFrom(items: PriceItem[]): string[] {
  return [...new Set(items.map((i) => i.category))].sort();
}

export function vegTypesFrom(items: PriceItem[]): string[] {
  return [...new Set(items.map((i) => i.vegType))].sort();
}
