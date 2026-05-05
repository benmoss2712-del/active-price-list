import type { CustomerDetails, QuotationDraft, QuotationLineDraft } from "../types/quotation";

export type ApiSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAtIso?: string;
  userId?: string;
};

export type RemoteQuoteStatus = "draft" | "sent" | "accepted" | "declined";

export type RemoteCustomer = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export type RemoteQuoteLine = {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
};

export type RemoteQuotePayload = {
  quoteNumber?: string;
  createdAtIso: string;
  validUntilIso?: string;
  status: RemoteQuoteStatus;
  customer: RemoteCustomer;
  lines: RemoteQuoteLine[];
  discountPercent: number;
  taxPercent: number;
  notes?: string;
  source: "mobile-app";
};

export type RemoteQuote = RemoteQuotePayload & {
  id: string;
  quoteNumber: string;
};

export type QueueQuoteSubmit = {
  type: "quote.submit";
  localId: string;
  payload: RemoteQuotePayload;
  createdAtIso: string;
};

export type SyncQueueItem = QueueQuoteSubmit;

export type QuoteSubmissionResult =
  | { mode: "submitted"; remoteId: string; quoteNumber: string }
  | { mode: "queued"; queueId: string };

export type IntegrationConfig = {
  baseUrl: string;
  timeoutMs: number;
};

export type CustomerRecord = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
};

export type ProductRecord = {
  sku: string;
  name: string;
  unit: string;
  category: string;
  price: number;
  currency: string;
};

export type PriceBreakRecord = {
  minQty: number;
  unitPrice: number;
};

/**
 * Remote (system) price record.
 *
 * Designed to support Sage 300-style pricing where a SKU can be priced by
 * price list and/or have quantity breaks.
 */
export type PriceRecord = {
  sku: string;
  currency: string;
  unitPrice: number;
  /**
   * Optional price list identifier (e.g. OE/IC price list code).
   * Omit when your backend resolves pricing without exposing lists.
   */
  priceList?: string;
  /**
   * Optional ISO timestamp for the pricing snapshot.
   * Useful for cache headers / "last synced" UI later.
   */
  asOfIso?: string;
  /** Optional quantity breaks (sorted ascending by minQty). */
  breaks?: PriceBreakRecord[];
};

export type TaxRateRecord = {
  code: string;
  label: string;
  percent: number;
};

export type QuotationMapperInput = {
  draft: QuotationDraft;
  lines: QuotationLineDraft[];
  customer: CustomerDetails;
};
