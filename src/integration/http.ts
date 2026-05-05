import { getIntegrationConfig } from "./config";
import { loadApiSession } from "./authStorage";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
};

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown
  ) {
    super(message);
  }
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const cfg = getIntegrationConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (options.auth !== false) {
      const session = await loadApiSession();
      if (session?.accessToken) {
        headers.Authorization = `Bearer ${session.accessToken}`;
      }
    }
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const text = await res.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) {
      throw new HttpError(
        `HTTP ${res.status} on ${options.method ?? "GET"} ${path}`,
        res.status,
        payload
      );
    }
    return payload as T;
  } finally {
    clearTimeout(timeout);
  }
}
