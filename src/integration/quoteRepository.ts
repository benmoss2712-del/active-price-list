import { createRemoteQuote } from "./quoteApi";
import { mapQuotationDraftToRemotePayload } from "./quoteMapper";
import { enqueueSyncItem, loadSyncQueue, removeSyncItem } from "./syncQueueStorage";
import type { QuotationDraft } from "../types/quotation";
import type { QuoteSubmissionResult } from "./types";

export async function submitQuotationDraft(
  draft: QuotationDraft
): Promise<QuoteSubmissionResult> {
  const payload = mapQuotationDraftToRemotePayload(draft);
  try {
    const remote = await createRemoteQuote(payload);
    return {
      mode: "submitted",
      remoteId: remote.id,
      quoteNumber: remote.quoteNumber,
    };
  } catch {
    const queueId = await enqueueSyncItem({
      type: "quote.submit",
      createdAtIso: new Date().toISOString(),
      payload,
    });
    return {
      mode: "queued",
      queueId,
    };
  }
}

export async function flushQuoteSyncQueue(): Promise<{
  succeeded: number;
  failed: number;
}> {
  const queue = await loadSyncQueue();
  let succeeded = 0;
  let failed = 0;
  for (const item of queue) {
    try {
      if (item.type === "quote.submit") {
        await createRemoteQuote(item.payload);
        await removeSyncItem(item.localId);
        succeeded += 1;
      }
    } catch {
      failed += 1;
    }
  }
  return { succeeded, failed };
}
