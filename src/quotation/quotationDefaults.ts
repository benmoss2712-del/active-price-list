import type {
  CustomerDetails,
  QuotationDraft,
  QuotationLineDraft,
  QuotationStatus,
} from "../types/quotation";
import type { PriceItem } from "../data/prices";

function defaultQuoteNumberFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const t = String(d.getTime()).slice(-4);
  return `Q-${y}${m}${day}-${t}`;
}

export function emptyCustomer(): CustomerDetails {
  return {
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
  };
}

export function newLineKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function lineFromPriceItem(p: PriceItem): QuotationLineDraft {
  return {
    key: newLineKey(),
    sku: p.sku,
    productName: p.name,
    category: p.category,
    currency: p.currency,
    qtyStr: "1",
    unitPriceStr: p.price > 0 ? String(p.price) : "",
  };
}

export function emptyQuotationDraft(): QuotationDraft {
  const now = new Date();
  return {
    id: null,
    quoteNumber: defaultQuoteNumberFromDate(now),
    createdAtIso: now.toISOString(),
    validDaysStr: "30",
    customer: emptyCustomer(),
    lines: [],
    discountPercentStr: "0",
    taxPercentStr: "0",
    quoteDate: null,
    status: "draft",
  };
}

/** Assemble a full draft for export / storage helpers (e.g. `buildQuotationSummaryText`). */
export function toQuotationDraft(
  customer: CustomerDetails,
  lines: QuotationLineDraft[],
  discountPercentStr: string,
  taxPercentStr: string,
  opts?: {
    id?: string | null;
    quoteNumber?: string;
    createdAtIso?: string;
    validDaysStr?: string;
    quoteDate?: string | null;
    status?: QuotationStatus;
  }
): QuotationDraft {
  const now = new Date();
  return {
    id: opts?.id ?? null,
    quoteNumber: opts?.quoteNumber ?? defaultQuoteNumberFromDate(now),
    createdAtIso: opts?.createdAtIso ?? now.toISOString(),
    validDaysStr: opts?.validDaysStr ?? "30",
    customer,
    lines,
    discountPercentStr,
    taxPercentStr,
    quoteDate: opts?.quoteDate ?? null,
    status: opts?.status ?? "draft",
  };
}
