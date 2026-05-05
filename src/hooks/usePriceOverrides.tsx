import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ACTIVE_PRICES, PriceItem } from "../data/prices";
import {
  loadPriceOverrides,
  savePriceOverrides,
  type PriceOverridesMap,
} from "../persistence/priceOverridesStorage";

function applyOverrides(
  items: PriceItem[],
  overrides: PriceOverridesMap
): PriceItem[] {
  return items.map((item) => {
    if (Object.prototype.hasOwnProperty.call(overrides, item.sku)) {
      return { ...item, price: overrides[item.sku] };
    }
    return item;
  });
}

export type PriceOverridesContextValue = {
  items: PriceItem[];
  hydrated: boolean;
  overrides: PriceOverridesMap;
  setSkuPrice: (sku: string, price: number) => Promise<void>;
  clearSkuPrice: (sku: string) => Promise<void>;
  hasOverride: (sku: string) => boolean;
  mergeBulkPatch: (patch: PriceOverridesMap) => Promise<void>;
};

const PriceOverridesContext = createContext<PriceOverridesContextValue | null>(
  null
);

export function PriceOverridesProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<PriceOverridesMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPriceOverrides().then((o) => {
      if (!cancelled) {
        setOverrides(o);
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(
    () => applyOverrides(ACTIVE_PRICES, overrides),
    [overrides]
  );

  const setSkuPrice = useCallback(async (sku: string, price: number) => {
    setOverrides((prev) => {
      const next = { ...prev, [sku]: price };
      void savePriceOverrides(next);
      return next;
    });
  }, []);

  const clearSkuPrice = useCallback(async (sku: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[sku];
      void savePriceOverrides(next);
      return next;
    });
  }, []);

  const hasOverride = useCallback(
    (sku: string) => Object.prototype.hasOwnProperty.call(overrides, sku),
    [overrides]
  );

  const mergeBulkPatch = useCallback(async (patch: PriceOverridesMap) => {
    setOverrides((prev) => {
      const next = { ...prev, ...patch };
      void savePriceOverrides(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      items,
      hydrated,
      overrides,
      setSkuPrice,
      clearSkuPrice,
      hasOverride,
      mergeBulkPatch,
    }),
    [
      items,
      hydrated,
      overrides,
      setSkuPrice,
      clearSkuPrice,
      hasOverride,
      mergeBulkPatch,
    ]
  );

  return (
    <PriceOverridesContext.Provider value={value}>
      {children}
    </PriceOverridesContext.Provider>
  );
}

export function usePriceOverrides(): PriceOverridesContextValue {
  const ctx = useContext(PriceOverridesContext);
  if (!ctx) {
    throw new Error("usePriceOverrides must be used within PriceOverridesProvider");
  }
  return ctx;
}
