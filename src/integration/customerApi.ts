import { requestJson } from "./http";
import type { CustomerRecord } from "./types";

export async function searchRemoteCustomers(query: string): Promise<CustomerRecord[]> {
  const q = query.trim();
  return requestJson<CustomerRecord[]>(
    `/customers?search=${encodeURIComponent(q)}`,
    { auth: true }
  );
}
