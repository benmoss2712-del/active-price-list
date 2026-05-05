/**
 * Customer-name autocomplete seed (publishable).
 *
 * The real customer list was previously embedded here as an offline fallback,
 * but that's company-confidential data and shouldn't ship to a public website
 * or a public Git repo. The original list is preserved on this developer's
 * machine at `src/data/customers.local.ts`, which is gitignored.
 *
 * Long-term plan: serve customer suggestions from the company API via
 * `src/integration/customerApi.ts` so the offline fallback can stay empty.
 */

export const CUSTOMER_NAMES: readonly string[] = [];
