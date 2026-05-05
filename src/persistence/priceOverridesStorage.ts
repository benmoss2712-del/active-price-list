import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@active-price-list/v1/price-overrides-by-sku";

export type PriceOverridesMap = Record<string, number>;

export async function loadPriceOverrides(): Promise<PriceOverridesMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: PriceOverridesMap = {};
    for (const [sku, v] of Object.entries(parsed)) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) continue;
      out[sku] = Math.round(n * 100) / 100;
    }
    return out;
  } catch {
    return {};
  }
}

export async function savePriceOverrides(
  overrides: PriceOverridesMap
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}
