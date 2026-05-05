/** Quotation / customer foundation — import from `"../quotation"` or explicit paths. */
export { buildQuotationSummaryText } from "./buildQuotationSummary";
export { buildQuotationPrintHtml } from "./buildQuotationPrintHtml";
export {
  emptyCustomer,
  emptyQuotationDraft,
  lineFromPriceItem,
  newLineKey,
  toQuotationDraft,
} from "./quotationDefaults";
export {
  lineExtendedAmount,
  parseNonNegativeDecimal,
  quotationSubtotal,
  quotationTotals,
} from "./quotationMath";
export type { QuotationTotals } from "./quotationMath";
