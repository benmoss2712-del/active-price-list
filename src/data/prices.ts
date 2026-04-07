/** Active price list — replace or load from your API. */
export type PriceItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  price: number;
  currency: string;
  category: string;
};

/** Demo data — swap for API response in production */
export const ACTIVE_PRICES: PriceItem[] = [
  {
    id: "1",
    sku: "FC-001",
    name: "Layer mash 50kg",
    unit: "bag",
    price: 28.5,
    currency: "USD",
    category: "Feed",
  },
  {
    id: "2",
    sku: "FC-002",
    name: "Broiler starter 50kg",
    unit: "bag",
    price: 31.0,
    currency: "USD",
    category: "Feed",
  },
  {
    id: "3",
    sku: "SD-100",
    name: "Hybrid maize seed 10kg",
    unit: "unit",
    price: 45.0,
    currency: "USD",
    category: "Seed",
  },
  {
    id: "4",
    sku: "NF-LAY",
    name: "Layer pellets 25kg",
    unit: "bag",
    price: 18.75,
    currency: "USD",
    category: "Feed",
  },
  {
    id: "5",
    sku: "CH-VIT",
    name: "Poultry vitamin supplement 1L",
    unit: "bottle",
    price: 12.4,
    currency: "USD",
    category: "Supplements",
  },
];

export const PRICE_LIST_VERSION = "2026-04-07T12:00:00.000Z";

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export function filterPrices(
  items: PriceItem[],
  query: string,
  category: string | null
): PriceItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    const catOk = !category || item.category === category;
    if (!q) return catOk;
    const match =
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return catOk && match;
  });
}

export function categoriesFrom(items: PriceItem[]): string[] {
  return [...new Set(items.map((i) => i.category))].sort();
}
