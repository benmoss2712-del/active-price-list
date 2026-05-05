import { requestJson } from "./http";
import type { PriceRecord } from "./types";

export type FetchRemotePricesParams = {
  /**
   * Optional price list code (Sage 300 OE/IC price list).
   * Leave undefined to use backend defaults.
   */
  priceList?: string;
  /** Optional currency code (e.g. USD). */
  currency?: string;
  /** Optional customer id for customer-specific pricing. */
  customerId?: string;
};

function encodeQuery(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!.trim())}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * Fetch system prices from the integration backend.
 *
 * Your backend should implement `GET /prices` and return `PriceRecord[]`.
 */
export async function fetchRemotePrices(
  params: FetchRemotePricesParams = {}
): Promise<PriceRecord[]> {
  const q = encodeQuery({
    priceList: params.priceList,
    currency: params.currency,
    customerId: params.customerId,
  });
  return requestJson<PriceRecord[]>(`/prices${q}`, { auth: true });
}

