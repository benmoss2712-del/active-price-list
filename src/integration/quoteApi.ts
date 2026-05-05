import { requestJson } from "./http";
import type { RemoteQuote, RemoteQuotePayload } from "./types";

export async function createRemoteQuote(payload: RemoteQuotePayload): Promise<RemoteQuote> {
  return requestJson<RemoteQuote>("/quotes", {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export async function updateRemoteQuote(
  id: string,
  payload: RemoteQuotePayload
): Promise<RemoteQuote> {
  return requestJson<RemoteQuote>(`/quotes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export async function submitRemoteQuote(id: string): Promise<RemoteQuote> {
  return requestJson<RemoteQuote>(`/quotes/${encodeURIComponent(id)}/submit`, {
    method: "POST",
    auth: true,
  });
}
