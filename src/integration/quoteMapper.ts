import { parseNonNegativeDecimal } from "../quotation/quotationMath";
import type { QuotationDraft } from "../types/quotation";
import type { RemoteQuotePayload } from "./types";

function validUntil(createdAtIso: string, validDaysStr: string): string | undefined {
  const days = Number.parseInt(validDaysStr, 10);
  const createdAt = new Date(createdAtIso);
  if (!Number.isFinite(days) || Number.isNaN(createdAt.getTime())) return undefined;
  const d = new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

export function mapQuotationDraftToRemotePayload(draft: QuotationDraft): RemoteQuotePayload {
  return {
    quoteNumber: draft.quoteNumber || undefined,
    createdAtIso: draft.createdAtIso,
    validUntilIso: validUntil(draft.createdAtIso, draft.validDaysStr),
    status: draft.status,
    customer: {
      name: draft.customer.name,
      company: draft.customer.company || undefined,
      email: draft.customer.email || undefined,
      phone: draft.customer.phone || undefined,
      notes: draft.customer.notes || undefined,
    },
    lines: draft.lines
      .map((line) => {
        const quantity = parseNonNegativeDecimal(line.qtyStr);
        const unitPrice = parseNonNegativeDecimal(line.unitPriceStr);
        if (quantity === null || unitPrice === null) return null;
        return {
          sku: line.sku,
          description: line.productName,
          quantity,
          unitPrice,
          currency: line.currency,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null),
    discountPercent: parseNonNegativeDecimal(draft.discountPercentStr) ?? 0,
    taxPercent: parseNonNegativeDecimal(draft.taxPercentStr) ?? 0,
    notes: draft.customer.notes || undefined,
    source: "mobile-app",
  };
}
