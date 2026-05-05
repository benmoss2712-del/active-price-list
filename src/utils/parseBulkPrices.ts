import type { PriceOverridesMap } from "../persistence/priceOverridesStorage";

export type BulkParseResult = {
  patch: PriceOverridesMap;
  applied: number;
  unknownSkus: string[];
  badLines: string[];
};

/** Recognize header row from Excel exports */
function isHeaderLine(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (!t) return false;
  return (
    (t.includes("sku") || t.includes("code") || t.includes("product")) &&
    (t.includes("price") || t.includes("amount") || t.includes("usd") || t.includes("cost"))
  );
}

function parsePrice(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/**
 * One row → SKU + price. Supports:
 * - Tab-separated (best: copy two columns from Excel / Sheets)
 * - Comma: last comma separates SKU from price (SKU should not contain commas)
 * - Semicolon-separated (common EU CSV)
 */
function parseLine(line: string): { sku: string; price: number } | null {
  const t = line.trim();
  if (!t) return null;

  const tabs = t.split("\t");
  if (tabs.length >= 2) {
    const priceRaw = tabs[tabs.length - 1];
    const sku = tabs.slice(0, -1).join("\t").trim();
    const price = parsePrice(priceRaw);
    if (sku && price !== null) return { sku, price };
    return null;
  }

  const semis = t.split(";");
  if (semis.length === 2) {
    const sku = semis[0].trim();
    const price = parsePrice(semis[1]);
    if (sku && price !== null) return { sku, price };
    return null;
  }

  const lastComma = t.lastIndexOf(",");
  if (lastComma > 0) {
    const sku = t.slice(0, lastComma).trim();
    const price = parsePrice(t.slice(lastComma + 1));
    if (sku && price !== null) return { sku, price };
  }

  return null;
}

export function parseBulkPricesText(
  text: string,
  validSkus: Set<string>
): BulkParseResult {
  const lines = text.split(/\r?\n/);
  const patch: PriceOverridesMap = {};
  const unknownSkus: string[] = [];
  const badLines: string[] = [];
  let first = true;

  for (const line of lines) {
    if (!line.trim()) continue;
    if (first && isHeaderLine(line)) {
      first = false;
      continue;
    }
    first = false;

    const parsed = parseLine(line);
    if (!parsed) {
      badLines.push(line.trim());
      continue;
    }

    if (!validSkus.has(parsed.sku)) {
      unknownSkus.push(parsed.sku);
      continue;
    }

    patch[parsed.sku] = parsed.price;
  }

  return {
    patch,
    applied: Object.keys(patch).length,
    unknownSkus,
    badLines,
  };
}
