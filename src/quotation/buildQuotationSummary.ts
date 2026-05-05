import { formatMoney } from "../data/prices";
import type { QuotationDraft } from "../types/quotation";
import {
  lineExtendedAmount,
  quotationTotals,
} from "./quotationMath";

/**
 * Plain-text summary for future PDF / email / share sheets.
 * Stub: extend with quote #, dates, terms, branding.
 */
export function buildQuotationSummaryText(draft: QuotationDraft): string {
  const {
    customer,
    lines,
    discountPercentStr,
    taxPercentStr,
    quoteNumber,
    createdAtIso,
    validDaysStr,
    status,
  } = draft;
  const {
    subtotal,
    discountRatePercent,
    discountAmount,
    discountedSubtotal,
    taxRatePercent,
    taxAmount,
    grandTotal,
  } = quotationTotals(
    lines,
    taxPercentStr,
    discountPercentStr
  );
  const createdDate = new Date(createdAtIso);
  const createdLabel = Number.isNaN(createdDate.getTime())
    ? createdAtIso
    : createdDate.toLocaleDateString();
  const validDays = Number.parseInt(validDaysStr, 10);
  const expiryDate = Number.isFinite(validDays)
    ? new Date(createdDate.getTime() + validDays * 24 * 60 * 60 * 1000)
    : null;
  const expiryLabel =
    expiryDate && !Number.isNaN(expiryDate.getTime())
      ? expiryDate.toLocaleDateString()
      : "Not set";

  const hdr: string[] = [
    "QUOTATION",
    `Quote no: ${quoteNumber}`,
    `Created: ${createdLabel}`,
    `Valid until: ${expiryLabel}`,
    `Status: ${status.toUpperCase()}`,
  ];
  if (customer.name.trim()) hdr.push(`Customer: ${customer.name.trim()}`);
  if (customer.company.trim()) hdr.push(`Company: ${customer.company.trim()}`);
  if (customer.email.trim()) hdr.push(`Email: ${customer.email.trim()}`);
  if (customer.phone.trim()) hdr.push(`Phone: ${customer.phone.trim()}`);
  if (customer.notes.trim()) hdr.push(`Notes: ${customer.notes.trim()}`);
  hdr.push("");

  const body: string[] = [];
  for (const line of lines) {
    const ext = lineExtendedAmount(line);
    const amt =
      ext === null ? "—" : formatMoney(ext, line.currency);
    body.push(`• ${line.productName} (${line.sku})  Qty ${line.qtyStr} × ${line.unitPriceStr}  →  ${amt}`);
  }

  const foot: string[] = [
    "",
    `Subtotal: USD ${subtotal.toFixed(2)}`,
    ...(discountRatePercent > 0
      ? [
          `Discount (${discountRatePercent}%): -USD ${discountAmount.toFixed(2)}`,
          `Net subtotal: USD ${discountedSubtotal.toFixed(2)}`,
        ]
      : []),
    ...(taxRatePercent > 0
      ? [`Tax (${taxRatePercent}%): USD ${taxAmount.toFixed(2)}`]
      : []),
    `Total: USD ${grandTotal.toFixed(2)}`,
  ];

  return [...hdr, ...body, ...foot].join("\n");
}
