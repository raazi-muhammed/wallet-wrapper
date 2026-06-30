import axios from "axios";
import type { components, operations } from "./wallet-api.d";

// ── Raw generated types (used only for API call shapes) ───────────────────────

type RawAccount = components["schemas"]["Account"];
type RawRecord = components["schemas"]["Record"];
type RawCategory = components["schemas"]["Category"];
export type CreateRecordRequest = components["schemas"]["CreateRecordRequest"];
export type PatchRecordItem = components["schemas"]["PatchRecordItem"];
export type CreateRecordsResponse = components["schemas"]["CreateRecordsResponse"];
export type PatchRecordsResponse = components["schemas"]["PatchRecordsResponse"];

type GetAccountsParams = operations["getAccounts"]["parameters"]["query"];
type GetRecordsParams = operations["getRecords"]["parameters"]["query"];
type GetCategoriesParams = operations["getCategories"]["parameters"]["query"];

// ── Concrete app-level types ──────────────────────────────────────────────────
// These narrow the generated optional fields to reflect what the API always returns.

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
    creditLimit?: number;
    availableCredit?: number;
  };
  recordStats?: { recordCount: number };
}

export interface WalletRecord {
  id: string;
  accountId: string;
  accountName: string;
  note?: string;
  counterParty?: string;
  amount: { value: number; currencyCode: string };
  recordDate: string;
  paymentType: "cash" | "debit_card" | "credit_card" | "transfer" | "voucher" | "mobile_payment" | "web_payment";
  recordType: "income" | "expense" | "transfer";
  recordState?: "reconciled" | "cleared" | "uncleared" | "void" | "waitForAssign";
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

export interface ApiStats {
  rateLimit: number;
  rateLimitRemaining: number;
  lastDataChangeAt: string | null;
  lastDataChangeRev: string | null;
  syncInProgress: boolean;
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function mapAccount(a: RawAccount): Account {
  return {
    id: a.id!,
    name: a.name!,
    accountType: a.accountType ?? "General",
    archived: a.archived ?? false,
    color: a.color,
    initialBalance: {
      value: a.initialBalance?.value ?? 0,
      currencyCode: a.initialBalance?.currencyCode ?? a.balance?.currencyCode ?? "USD",
    },
    balance: {
      currencyCode: a.balance?.currencyCode ?? "USD",
      currentBalance: a.balance?.currentBalance ?? 0,
      initial: a.balance?.initial ?? 0,
      totalIncomes: a.recordStats?.totalIncomes ?? 0,
      totalExpenses: a.recordStats?.totalExpenses ?? 0,
      creditLimit: a.balance?.creditLimit,
      availableCredit: a.balance?.availableCredit,
    },
    recordStats: a.recordStats?.recordCount != null
      ? { recordCount: a.recordStats.recordCount }
      : undefined,
  };
}

function mapRecord(r: RawRecord): WalletRecord {
  return {
    id: r.id!,
    accountId: r.accountId!,
    accountName: r.accountName!,
    note: r.note,
    counterParty: r.counterParty,
    amount: { value: r.amount?.value ?? 0, currencyCode: r.amount?.currencyCode ?? "USD" },
    recordDate: r.recordDate!,
    paymentType: r.paymentType ?? "cash",
    recordType: r.recordType ?? "expense",
    recordState: r.recordState,
    category: r.category
      ? {
          id: r.category.id!,
          name: r.category.name!,
          color: r.category.color,
          group: r.category.group
            ? { id: r.category.group.id!, name: r.category.group.name! }
            : undefined,
        }
      : undefined,
  };
}

function mapCategory(c: RawCategory): Category {
  // Derive income/expense type from the category group slug
  let categoryType: string | undefined;
  if (c.group?.id) {
    categoryType = c.group.id === "income" ? "income" : "expense";
  }
  return {
    id: c.id!,
    name: c.name!,
    color: c.color,
    categoryType,
    group: c.group ? { id: c.group.id!, name: c.group.name! } : undefined,
  };
}

// ── Client factory ────────────────────────────────────────────────────────────

const BASE = "https://rest.budgetbakers.com/wallet/v1/api";

export function createWalletClient(token: string) {
  const http = axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    async getAccounts(params?: GetAccountsParams): Promise<{ accounts: Account[]; nextOffset?: number }> {
      const { data } = await http.get<{ accounts?: RawAccount[]; nextOffset?: number }>("/accounts", { params });
      return {
        accounts: (data.accounts ?? []).map(mapAccount),
        nextOffset: data.nextOffset,
      };
    },

    async getRecords(params?: GetRecordsParams): Promise<{ records: WalletRecord[]; nextOffset?: number }> {
      const { data } = await http.get<{ records?: RawRecord[]; nextOffset?: number }>("/records", { params });
      return {
        records: (data.records ?? []).map(mapRecord),
        nextOffset: data.nextOffset,
      };
    },

    async getCategories(params?: GetCategoriesParams): Promise<{ categories: Category[] }> {
      const { data } = await http.get<{ categories?: RawCategory[] }>("/categories", { params });
      return { categories: (data.categories ?? []).map(mapCategory) };
    },

    async createRecords(records: CreateRecordRequest[]): Promise<CreateRecordsResponse> {
      const { data } = await http.post<CreateRecordsResponse>("/records", records);
      return data;
    },

    async patchRecord(id: string, patch: Omit<PatchRecordItem, "id">): Promise<PatchRecordsResponse> {
      const { data } = await http.patch<PatchRecordsResponse>("/records", [{ id, ...patch }]);
      return data;
    },

    async getStats(): Promise<ApiStats> {
      const res = await http.get("/accounts", { params: { limit: 1 } });
      return {
        rateLimit: Number(res.headers["x-ratelimit-limit"] ?? 300),
        rateLimitRemaining: Number(res.headers["x-ratelimit-remaining"] ?? 0),
        lastDataChangeAt: res.headers["x-last-data-change-at"] ?? null,
        lastDataChangeRev: res.headers["x-last-data-change-rev"] ?? null,
        syncInProgress: res.headers["x-sync-in-progress"] === "true",
      };
    },
  };
}
