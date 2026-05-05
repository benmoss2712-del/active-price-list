/**
 * Foundation types for customer-tagged quotations (UI + persistence TBD).
 */

export type QuotationStatus = "draft" | "sent" | "accepted" | "declined";

/** Customer block shown on quotes — all fields optional until you require them. */
export type CustomerDetails = {
  name: string;
  company: string;
  email: string;
  phone: string;
  /** Free text, e.g. delivery address or account ref */
  notes: string;
};

/** One catalog line while editing; strings keep in-progress typing valid. */
export type QuotationLineDraft = {
  key: string;
  sku: string;
  productName: string;
  category: string;
  currency: string;
  qtyStr: string;
  unitPriceStr: string;
};

/**
 * In-memory quotation before save/export.
 * `id` / `quoteDate` / `status` are wired for future storage and PDF/email flows.
 */
export type QuotationDraft = {
  id: string | null;
  quoteNumber: string;
  createdAtIso: string;
  validDaysStr: string;
  customer: CustomerDetails;
  lines: QuotationLineDraft[];
  discountPercentStr: string;
  taxPercentStr: string;
  /** ISO date-only or datetime string when you add date picking */
  quoteDate: string | null;
  status: QuotationStatus;
};
