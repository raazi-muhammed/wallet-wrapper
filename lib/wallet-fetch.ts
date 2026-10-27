import type * as reads from "@/lib/wallet-reads";

// Client-side readers. Each one calls app/api/wallet/[resource]/route.ts, so a
// page's queries load in parallel instead of queueing like Server Actions do.

type Result<F extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<F>>;

async function get<T>(token: string, resource: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.size ? `?${search}` : "";
  const res = await fetch(`/api/wallet/${resource}${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

export const fetchAccounts = (token: string) => get<Result<typeof reads.fetchAccounts>>(token, "accounts");

export const fetchRecords = (token: string, opts: Parameters<typeof reads.fetchRecords>[1] = {}) =>
  get<Result<typeof reads.fetchRecords>>(token, "records", opts);

export const fetchApiStats = (token: string) => get<Result<typeof reads.fetchApiStats>>(token, "stats");

export const fetchCategories = (token: string) => get<Result<typeof reads.fetchCategories>>(token, "categories");

export const fetchLabels = (token: string) => get<Result<typeof reads.fetchLabels>>(token, "labels");

export const fetchBudgets = (token: string) => get<Result<typeof reads.fetchBudgets>>(token, "budgets");

export const fetchStandingOrders = (token: string) =>
  get<Result<typeof reads.fetchStandingOrders>>(token, "standing-orders");

/** Occurrences of every standing order whose original date is on or after `from` (ISO date), excluding dismissed ones. */
export const fetchStandingOrderItems = (token: string, from: string) =>
  get<Result<typeof reads.fetchStandingOrderItems>>(token, "standing-order-items", { from });
