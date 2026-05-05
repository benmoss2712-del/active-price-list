import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QuotationDraft } from "../types/quotation";

const KEY_PREFIX = "@active-price-list/v1/saved-quotes/";

export type SavedQuote = QuotationDraft & {
  id: string; // narrowed: saved quotes always carry an id
  ownerUserId: string;
  savedAtIso: string;
  updatedAtIso: string;
};

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export async function loadSavedQuotes(userId: string): Promise<SavedQuote[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedQuote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeSavedQuotes(
  userId: string,
  quotes: SavedQuote[]
): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(quotes));
}

function generateQuoteId(): string {
  return `sq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Insert or update a quote in the user's saved list.
 *
 * If `draft.id` is null/missing, a new id is assigned. If it matches an
 * existing entry it is replaced (preserving `savedAtIso`). The returned
 * SavedQuote is the canonical record.
 */
export async function upsertSavedQuote(
  userId: string,
  draft: QuotationDraft
): Promise<SavedQuote> {
  const quotes = await loadSavedQuotes(userId);
  const nowIso = new Date().toISOString();
  const existingIdx = draft.id
    ? quotes.findIndex((q) => q.id === draft.id)
    : -1;

  if (existingIdx >= 0) {
    const existing = quotes[existingIdx];
    const updated: SavedQuote = {
      ...draft,
      id: existing.id,
      ownerUserId: userId,
      savedAtIso: existing.savedAtIso,
      updatedAtIso: nowIso,
    };
    const next = quotes.slice();
    next[existingIdx] = updated;
    await writeSavedQuotes(userId, next);
    return updated;
  }

  const created: SavedQuote = {
    ...draft,
    id: draft.id ?? generateQuoteId(),
    ownerUserId: userId,
    savedAtIso: nowIso,
    updatedAtIso: nowIso,
  };
  await writeSavedQuotes(userId, [created, ...quotes]);
  return created;
}

export async function deleteSavedQuote(
  userId: string,
  quoteId: string
): Promise<void> {
  const quotes = await loadSavedQuotes(userId);
  const next = quotes.filter((q) => q.id !== quoteId);
  await writeSavedQuotes(userId, next);
}

export async function getSavedQuoteById(
  userId: string,
  quoteId: string
): Promise<SavedQuote | null> {
  const quotes = await loadSavedQuotes(userId);
  return quotes.find((q) => q.id === quoteId) ?? null;
}
