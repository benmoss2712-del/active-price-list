import type { IntegrationConfig } from "./types";

const FALLBACK_BASE_URL = "https://api.your-company.local";

export function getIntegrationConfig(): IntegrationConfig {
  const baseUrl =
    process.env.EXPO_PUBLIC_COMPANY_API_BASE_URL?.trim() || FALLBACK_BASE_URL;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    timeoutMs: 20000,
  };
}

export function hasRealIntegrationConfig(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_COMPANY_API_BASE_URL?.trim());
}
