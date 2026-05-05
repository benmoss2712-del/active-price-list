export { getIntegrationConfig, hasRealIntegrationConfig } from "./config";
export { loadApiSession, saveApiSession, clearApiSession } from "./authStorage";
export { requestJson, HttpError } from "./http";
export { fetchRemoteProducts, fetchTaxRates } from "./catalogApi";
export { fetchRemotePrices } from "./pricesApi";
export { searchRemoteCustomers } from "./customerApi";
export { createRemoteQuote, submitRemoteQuote, updateRemoteQuote } from "./quoteApi";
export { submitQuotationDraft, flushQuoteSyncQueue } from "./quoteRepository";
export { mapQuotationDraftToRemotePayload } from "./quoteMapper";
export { loadSyncQueue } from "./syncQueueStorage";
export type {
  ApiSession,
  CustomerRecord,
  ProductRecord,
  QuoteSubmissionResult,
  RemoteQuote,
  RemoteQuotePayload,
  PriceRecord,
  PriceBreakRecord,
  TaxRateRecord,
} from "./types";
