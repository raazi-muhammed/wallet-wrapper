"use server";

const BASE = "https://rest.budgetbakers.com/wallet/v1/api";

export async function fetchAccounts(token: string) {
  const res = await fetch(`${BASE}/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Accounts: ${res.status}`);
  const data = await res.json();
  return (data.accounts ?? data) as Account[];
}

export async function fetchRecords(token: string) {
  const res = await fetch(`${BASE}/records?limit=200`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Records: ${res.status}`);
  const data = await res.json();
  return (data.records ?? data) as WalletRecord[];
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
