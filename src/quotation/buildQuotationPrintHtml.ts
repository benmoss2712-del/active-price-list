import type { QuotationDraft } from "../types/quotation";
import { LOGO_DATA_URI } from "./logoDataUri";
import { lineExtendedAmount, quotationTotals } from "./quotationMath";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function expiryFrom(createdAtIso: string, validDaysStr: string): string {
  const created = new Date(createdAtIso);
  const days = Number.parseInt(validDaysStr, 10);
  if (Number.isNaN(created.getTime()) || !Number.isFinite(days)) return "Not set";
  const exp = new Date(created.getTime() + days * 24 * 60 * 60 * 1000);
  return exp.toLocaleDateString();
}

export function buildQuotationPrintHtml(draft: QuotationDraft): string {
  const totals = quotationTotals(
    draft.lines,
    draft.taxPercentStr,
    draft.discountPercentStr
  );

  const lineRows = draft.lines
    .map((line) => {
      const ext = lineExtendedAmount(line);
      const lineTax =
        ext === null
          ? null
          : Math.round((ext * (totals.taxRatePercent / 100) + Number.EPSILON) * 100) /
            100;
      const qty = escapeHtml(line.qtyStr || "0");
      const price = escapeHtml(line.unitPriceStr || "0");
      const tax = lineTax === null ? "-" : lineTax.toFixed(2);
      const total = ext === null ? "-" : ext.toFixed(2);
      return `<tr>
  <td>${escapeHtml(line.productName)}</td>
  <td>${escapeHtml(line.sku)}</td>
  <td class="num">${qty}</td>
  <td class="num">${escapeHtml(line.currency)} ${price}</td>
  <td class="num">${escapeHtml(line.currency)} ${tax}</td>
  <td class="num">${escapeHtml(line.currency)} ${total}</td>
</tr>`;
    })
    .join("\n");

  const customerLines = [
    draft.customer.name.trim(),
    draft.customer.company.trim(),
    draft.customer.email.trim(),
    draft.customer.phone.trim(),
  ]
    .filter(Boolean)
    .map((v) => `<div>${escapeHtml(v)}</div>`)
    .join("");

  const notesBlock = draft.customer.notes.trim()
    ? `<div class="notes"><strong>Address / Notes:</strong> ${escapeHtml(
        draft.customer.notes.trim()
      )}</div>`
    : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(draft.quoteNumber)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 28px; }
    .sheet { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; }
    .sheet-header { display: flex; justify-content: space-between; gap: 20px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
    .brand-block { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 56px; height: 56px; object-fit: contain; }
    .brand { font-size: 28px; font-weight: 800; letter-spacing: 1px; color: #334155; margin: 0; line-height: 1; }
    .brand-sub { margin-top: 4px; font-size: 11px; color: #64748b; }
    .doc-title { font-size: 30px; font-weight: 700; margin: 0; text-align: right; }
    .doc-sub { margin-top: 6px; font-size: 12px; color: #334155; text-align: right; }
    .company-row { display: flex; justify-content: space-between; gap: 24px; margin-top: 12px; }
    .company-col { flex: 1; font-size: 12px; line-height: 1.45; color: #334155; }
    .meta-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
    .status-pill { display: inline-block; margin-top: 8px; padding: 3px 8px; border-radius: 6px; border: 1px solid #94a3b8; background: #e2e8f0; font-size: 10px; font-weight: 700; letter-spacing: 0.2px; }
    .meta-grid { margin-top: 10px; border: 1px solid #cbd5e1; border-radius: 7px; overflow: hidden; }
    .meta-cell { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
    .meta-cell:last-child { border-bottom: 0; }
    .meta-cell-label { font-size: 10px; color: #475569; margin-bottom: 2px; }
    .meta-cell-value { font-size: 13px; color: #0f172a; min-height: 16px; }
    .doc-info { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .doc-info-cell { border: 1px solid #cbd5e1; border-radius: 7px; padding: 7px 8px; }
    .doc-info-label { font-size: 10px; color: #475569; margin-bottom: 3px; }
    .doc-info-value { font-size: 13px; font-weight: 600; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; vertical-align: top; }
    th { background: #f8fafc; text-align: left; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 14px; margin-left: auto; width: 360px; }
    .totals-row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 6px 0; font-size: 12px; }
    .totals-row.final { font-weight: 700; font-size: 14px; border-bottom: 2px solid #94a3b8; }
    .notes { margin-top: 14px; font-size: 12px; line-height: 1.5; }
    .bank-box { margin-top: 18px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
    .bank-title { font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #0f172a; }
    .bank-text { font-size: 11px; color: #334155; line-height: 1.5; }
    .preview-actions { margin-top: 18px; display: flex; justify-content: flex-end; }
    .print-btn {
      appearance: none;
      border: 1px solid #2563eb;
      background: #2563eb;
      color: #ffffff;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .print-btn:hover { background: #1d4ed8; border-color: #1d4ed8; }
    @media print {
      body { margin: 14mm; }
      .preview-actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="sheet-header">
      <div class="brand-block">
        <img class="brand-logo" src="${LOGO_DATA_URI}" alt="Intaba Trading logo" />
        <div>
          <h1 class="brand">INTABA TRADING</h1>
          <div class="brand-sub">Crop Solutions</div>
        </div>
      </div>
      <div>
        <h2 class="doc-title">Quotation</h2>
        <div class="doc-sub">Quote No: ${escapeHtml(draft.quoteNumber)}</div>
      </div>
    </div>

    <div class="company-row">
      <div class="company-col">
        <div class="meta-title">Intaba Trading (Pvt) Ltd</div>
        <div>4 Banty Road, Alexandra Park, Harare</div>
        <div>accounts@intabatrading.com</div>
        <div>+263 8677005240</div>
      </div>
      <div class="company-col">
        <div>Tax Registration: 20221472</div>
        <div>TIN: 2000753625</div>
        <div>Currency: USD</div>
        <div class="status-pill">${escapeHtml(draft.status.toUpperCase())}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-cell">
        <div class="meta-cell-label">Customer Name</div>
        <div class="meta-cell-value">${escapeHtml(draft.customer.name.trim()) || "&nbsp;"}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-cell-label">Company</div>
        <div class="meta-cell-value">${escapeHtml(
          draft.customer.company.trim()
        ) || "&nbsp;"}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-cell-label">Email</div>
        <div class="meta-cell-value">${escapeHtml(draft.customer.email.trim()) || "&nbsp;"}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-cell-label">Phone</div>
        <div class="meta-cell-value">${escapeHtml(draft.customer.phone.trim()) || "&nbsp;"}</div>
      </div>
    </div>

    <div class="doc-info">
      <div class="doc-info-cell">
        <div class="doc-info-label">Date</div>
        <div class="doc-info-value">${escapeHtml(formatDateLabel(draft.createdAtIso))}</div>
      </div>
      <div class="doc-info-cell">
        <div class="doc-info-label">Valid (days)</div>
        <div class="doc-info-value">${escapeHtml(draft.validDaysStr)}</div>
      </div>
      <div class="doc-info-cell">
        <div class="doc-info-label">Valid Until</div>
        <div class="doc-info-value">${escapeHtml(
          expiryFrom(draft.createdAtIso, draft.validDaysStr)
        )}</div>
      </div>
      <div class="doc-info-cell">
        <div class="doc-info-label">Quote Number</div>
        <div class="doc-info-value">${escapeHtml(draft.quoteNumber)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>SKU</th>
          <th class="num">Qty</th>
          <th class="num">Price</th>
          <th class="num">Tax</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>Sub Total (Exclusive)</span><span>USD ${totals.subtotal.toFixed(
        2
      )}</span></div>
      <div class="totals-row"><span>Tax (${totals.taxRatePercent.toFixed(
        2
      )}%)</span><span>USD ${totals.taxAmount.toFixed(2)}</span></div>
      <div class="totals-row"><span>Discount (${totals.discountRatePercent.toFixed(
        2
      )}%)</span><span>-USD ${totals.discountAmount.toFixed(2)}</span></div>
      <div class="totals-row final"><span>Invoice Total</span><span>USD ${totals.grandTotal.toFixed(
        2
      )}</span></div>
    </div>

    ${notesBlock}

    <div class="bank-box">
      <div class="bank-title">Banking Details</div>
      <div class="bank-text">Account Name: Intaba Trading (Pvt) Ltd</div>
      <div class="bank-text">Nedbank (Borrowdale): 31037000207</div>
      <div class="bank-text">Stanbic (Borrowdale): 914000053559</div>
      <div class="bank-text">Ecobank (Borrowdale): 5767200002071</div>
    </div>
  </div>

  <div class="preview-actions">
    <button class="print-btn" onclick="window.print()">Print this page</button>
  </div>
</body>
</html>`;
}

