import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/AuthContext";
import {
  deleteSavedQuote,
  loadSavedQuotes,
  upsertSavedQuote,
  type SavedQuote,
} from "../persistence/savedQuotesStorage";
import type { QuotationDraft } from "../types/quotation";

export type SavedQuotesContextValue = {
  hydrated: boolean;
  quotes: SavedQuote[];
  saveQuote: (draft: QuotationDraft) => Promise<SavedQuote | null>;
  deleteQuote: (quoteId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const SavedQuotesContext = createContext<SavedQuotesContextValue | null>(null);

function sortNewestFirst(list: SavedQuote[]): SavedQuote[] {
  return [...list].sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
}

export function SavedQuotesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [hydrated, setHydrated] = useState(false);
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setQuotes([]);
      setHydrated(true);
      return () => {
        cancelled = true;
      };
    }
    setHydrated(false);
    loadSavedQuotes(userId).then((list) => {
      if (cancelled) return;
      setQuotes(sortNewestFirst(list));
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const list = await loadSavedQuotes(userId);
    setQuotes(sortNewestFirst(list));
  }, [userId]);

  const saveQuote = useCallback(
    async (draft: QuotationDraft): Promise<SavedQuote | null> => {
      if (!userId) return null;
      const saved = await upsertSavedQuote(userId, draft);
      setQuotes((prev) => {
        const filtered = prev.filter((q) => q.id !== saved.id);
        return sortNewestFirst([saved, ...filtered]);
      });
      return saved;
    },
    [userId]
  );

  const deleteQuote = useCallback(
    async (quoteId: string) => {
      if (!userId) return;
      await deleteSavedQuote(userId, quoteId);
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    },
    [userId]
  );

  const value = useMemo<SavedQuotesContextValue>(
    () => ({ hydrated, quotes, saveQuote, deleteQuote, refresh }),
    [hydrated, quotes, saveQuote, deleteQuote, refresh]
  );

  return (
    <SavedQuotesContext.Provider value={value}>
      {children}
    </SavedQuotesContext.Provider>
  );
}

export function useSavedQuotes(): SavedQuotesContextValue {
  const ctx = useContext(SavedQuotesContext);
  if (!ctx) {
    throw new Error("useSavedQuotes must be used within SavedQuotesProvider");
  }
  return ctx;
}
