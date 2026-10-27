import type * as reads from "@/lib/wallet-reads";

// Client-side readers. Each one calls app/api/wallet/[resource]/route.ts, so a
// page's queries load in parallel instead of queueing like Server Actions do.
// The token travels in its httpOnly cookie, so none of these take it.

type Result<F extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<F>>;

async function get<T>(resource: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.size ? `?${search}` : "";
  const res = await fetch(`/api/wallet/${resource}${query}`);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

export type AccountsData = Result<typeof reads.fetchAccounts>;

export const fetchAccounts = () => get<AccountsData>("accounts");

export const fetchRecords = (opts: Parameters<typeof reads.fetchRecords>[1] = {}) =>
  get<Result<typeof reads.fetchRecords>>("records", opts);

export const fetchApiStats = () => get<Result<typeof reads.fetchApiStats>>("stats");

export const fetchCategories = () => get<Result<typeof reads.fetchCategories>>("categories");

export const fetchLabels = () => get<Result<typeof reads.fetchLabels>>("labels");

export const fetchBudgets = () => get<Result<typeof reads.fetchBudgets>>("budgets");

export const fetchStandingOrders = () => get<Result<typeof reads.fetchStandingOrders>>("standing-orders");

/** Occurrences of every standing order whose original date is on or after `from` (ISO date), excluding dismissed ones. */
export const fetchStandingOrderItems = (from: string) =>
  get<Result<typeof reads.fetchStandingOrderItems>>("standing-order-items", { from });
