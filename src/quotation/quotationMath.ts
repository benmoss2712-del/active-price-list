import type { QuotationLineDraft } from "../types/quotation";

/** Parse a non-negative decimal from user input (comma as decimal allowed). */
export function parseNonNegativeDecimal(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 10000) / 10000;
}

export function lineExtendedAmount(line: QuotationLineDraft): number | null {
  const q = parseNonNegativeDecimal(line.qtyStr);
  const u = parseNonNegativeDecimal(line.unitPriceStr);
  if (q === null || u === null) return null;
  return Math.round(q * u * 100) / 100;
}

export function quotationSubtotal(lines: QuotationLineDraft[]): number {
  let s = 0;
  for (const line of lines) {
    const ext = lineExtendedAmount(line);
    if (ext === null) continue;
    s += ext;
  }
  return Math.round(s * 100) / 100;
}

export type QuotationTotals = {
  subtotal: number;
  discountRatePercent: number;
  discountAmount: number;
  discountedSubtotal: number;
  taxRatePercent: number;
  taxAmount: number;
  grandTotal: number;
};

export function quotationTotals(
  lines: QuotationLineDraft[],
  taxPercentStr: string,
  discountPercentStr = "0"
): QuotationTotals {
  const subtotal = quotationSubtotal(lines);
  const dr = parseNonNegativeDecimal(discountPercentStr);
  const discountRatePercent = dr === null ? 0 : Math.min(dr, 100);
  const discountAmount = Math.round(subtotal * (discountRatePercent / 100) * 100) / 100;
  const discountedSubtotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
  const tr = parseNonNegativeDecimal(taxPercentStr);
  const taxRatePercent = tr === null ? 0 : tr;
  const taxAmount = Math.round(discountedSubtotal * (taxRatePercent / 100) * 100) / 100;
  const grandTotal = Math.round((discountedSubtotal + taxAmount) * 100) / 100;
  return {
    subtotal,
    discountRatePercent,
    discountAmount,
    discountedSubtotal,
    taxRatePercent,
    taxAmount,
    grandTotal,
  };
}
