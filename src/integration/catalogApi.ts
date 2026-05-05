import { requestJson } from "./http";
import type { ProductRecord, TaxRateRecord } from "./types";

export async function fetchRemoteProducts(): Promise<ProductRecord[]> {
  return requestJson<ProductRecord[]>("/products", { auth: true });
}

export async function fetchTaxRates(): Promise<TaxRateRecord[]> {
  return requestJson<TaxRateRecord[]>("/tax-rates", { auth: true });
}
