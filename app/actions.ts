"use server";

const BASE = "https://rest.budgetbakers.com/wallet/v1/api";

export async function fetchAccounts(token: string) {
  const all: Account[] = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`${BASE}/accounts?limit=200&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Accounts: ${res.status}`);
    const data = await res.json();
    const page: Account[] = data.accounts ?? data;
    all.push(...page);
    if (!data.nextOffset || page.length === 0) break;
    offset = data.nextOffset;
  }
  return all;
}

export async function fetchRecords(
  token: string,
  opts: { accountId?: string; from?: string; offset?: number; limit?: number } = {}
): Promise<{ records: WalletRecord[]; nextOffset: number | null }> {
  const { accountId, from, offset = 0, limit = 200 } = opts;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (accountId) params.set("accountId", accountId);
  if (from) params.set("recordDate", `gte.${from}`);
  const res = await fetch(`${BASE}/records?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Records: ${res.status}`);
  const data = await res.json();
  return {
    records: (data.records ?? data) as WalletRecord[],
    nextOffset: data.nextOffset ?? null,
  };
}

export async function fetchApiStats(token: string): Promise<ApiStats> {
  const res = await fetch(`${BASE}/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Stats: ${res.status}`);
  return {
    rateLimit: Number(res.headers.get("x-ratelimit-limit") ?? 300),
    rateLimitRemaining: Number(res.headers.get("x-ratelimit-remaining") ?? 0),
    lastDataChangeAt: res.headers.get("x-last-data-change-at") ?? null,
    lastDataChangeRev: res.headers.get("x-last-data-change-rev") ?? null,
    syncInProgress: res.headers.get("x-sync-in-progress") === "true",
  };
}

export interface ApiStats {
  rateLimit: number;
  rateLimitRemaining: number;
  lastDataChangeAt: string | null;
  lastDataChangeRev: string | null;
  syncInProgress: boolean;
}

export interface Account {
  id: string;
  name: string;
  accountType: string;
  archived: boolean;
  color?: string;
  initialBalance: { value: number; currencyCode: string };
  balance: {
    currencyCode: string;
    currentBalance: number;
    initial: number;
    totalIncomes: number;
    totalExpenses: number;
  };
  recordStats?: {
    recordCount: number;
  };
}

export interface WalletRecord {
  id: string;
  accountId: string;
  accountName: string;
  note?: string;
  counterParty?: string;
  amount: { value: number; currencyCode: string };
  recordDate: string;
  paymentType: string;
  recordType: string;
  recordState?: string;
  category?: {
    id: string;
    name: string;
    color?: string;
    group?: { id: string; name: string };
  };
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  categoryType?: string;
  group?: { id: string; name: string };
}

export async function fetchCategories(token: string) {
  const res = await fetch(`${BASE}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Categories: ${res.status}`);
  const data = await res.json();
  return (data.categories ?? data) as Category[];
}
