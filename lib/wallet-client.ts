import axios from "axios";
import type { components, operations } from "./wallet-api.d";

// ── Raw generated types (used only for API call shapes) ───────────────────────

type RawAccount = components["schemas"]["Account"];
type RawRecord = components["schemas"]["Record"];
type RawCategory = components["schemas"]["Category"];
type RawLabel = components["schemas"]["Label"];
type RawBudget = components["schemas"]["Budget"];
type RawStandingOrder = components["schemas"]["StandingOrder"];
type RawStandingOrderItem = components["schemas"]["StandingOrderItem"];
export type CreateRecordRequest = components["schemas"]["CreateRecordRequest"];
export type PatchRecordItem = components["schemas"]["PatchRecordItem"];
export type PatchAccountItem = components["schemas"]["PatchAccountItem"];
export type PatchCategoryItem = components["schemas"]["PatchCategoryRequest"];
export type CreateSubcategoryRequest = components["schemas"]["CreateSubcategoryRequest"];
export type PatchLabelItem = components["schemas"]["PatchLabelItem"];
export type CreateLabelRequest = components["schemas"]["CreateLabelRequest"];
export type PatchBudgetItem = components["schemas"]["PatchBudgetRequest"];
export type DeletableType = operations["deleteByType"]["parameters"]["path"]["type"];
export type WalletColor = NonNullable<PatchLabelItem["color"]>;

type GetAccountsParams = operations["getAccounts"]["parameters"]["query"];
type GetRecordsParams = operations["getRecords"]["parameters"]["query"];
type GetCategoriesParams = operations["getCategories"]["parameters"]["query"];
type GetLabelsParams = operations["getLabels"]["parameters"]["query"];
type GetBudgetsParams = operations["getBudgets"]["parameters"]["query"];
type GetStandingOrdersParams = operations["getStandingOrders"]["parameters"]["query"];
type GetStandingOrderItemsParams = operations["getStandingOrderItems"]["parameters"]["query"];

// ── Concrete app-level types ──────────────────────────────────────────────────
// These narrow the generated optional fields to reflect what the API always returns.

export interface Account {
  id: string;
  name: string;
  accountType: string;
  archived: boolean;
  color?: string;
  excludeFromStats: boolean;
  bankAccountNumber?: string;
  isBankSync: boolean;
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

export interface LabelRef {
  id: string;
  name: string;
  color?: string;
}

export interface WalletRecord {
  id: string;
  accountId: string;
  accountName: string;
  accountIsBankSync: boolean;
  note?: string;
  counterParty?: string;
  amount: { value: number; currencyCode: string };
  recordDate: string;
  recordType: "income" | "expense" | "transfer";
  recordState?: "reconciled" | "cleared" | "uncleared" | "void" | "waitForAssign";
  category?: {
    id: string;
    name: string;
    color?: string;
    group?: { id: string; name: string };
  };
  labels: LabelRef[];
  place?: { name?: string; address?: string; latitude?: number; longitude?: number };
  /** Null for regular records; "paired" transfers have a linked mirror record on another account. */
  transfer: { paired: boolean; mirrorId?: string } | null;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  categoryType?: string;
  group?: { id: string; name: string };
  cardinality?: "none" | "must" | "need" | "want";
  customCategory: boolean;
  customName: boolean;
  parentId?: string;
  parentName?: string;
}

export interface Label {
  id: string;
  name: string;
  color?: string;
  archived: boolean;
}

export interface Budget {
  id: string;
  name: string;
  type: "BUDGET_INTERVAL_WEEK" | "BUDGET_INTERVAL_MONTH" | "BUDGET_INTERVAL_YEAR" | "BUDGET_ALL" | "BUDGET_CUSTOM";
  currencyCode: string;
  limit: number | null;
  closed: boolean;
  startDate?: string;
  endDate?: string;
  accountIds: string[];
  categoryIds: string[];
  labelIds: string[];
}

/** A recurring (planned) payment. */
export interface StandingOrder {
  id: string;
  name: string;
  type: "income" | "expense";
  /** Always positive; the sign comes from `type`. */
  amount: number;
  currencyCode: string;
  accountId?: string;
  categoryId?: string;
  counterParty?: string;
  note?: string;
  /** Next due date of the order. */
  dueDate?: string;
  /** RRULE string, e.g. "FREQ=MONTHLY;INTERVAL=1". */
  recurrenceRule?: string;
  manualPayment: boolean;
  paymentCount: number;
  labels: LabelRef[];
}

/** One occurrence (period) of a standing order. */
export interface StandingOrderItem {
  id: string;
  standingOrderId: string;
  originalDate: string;
  paidDate?: string;
  dismissed: boolean;
  recordIds: string[];
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
    excludeFromStats: a.excludeFromStats ?? false,
    bankAccountNumber: a.bankAccountNumber ?? undefined,
    isBankSync: a.isBankSync ?? false,
    balance: {
      currencyCode: a.balance?.currencyCode ?? a.currencyCode ?? "USD",
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
    accountIsBankSync: r.accountIsBankSync ?? false,
    note: r.note,
    counterParty: r.counterParty,
    amount: { value: r.amount?.value ?? 0, currencyCode: r.amount?.currencyCode ?? "USD" },
    recordDate: r.recordDate!,
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
    labels: (r.labels ?? []).map((l) => ({ id: l.id!, name: l.name!, color: l.color })),
    place: r.place ?? undefined,
    transfer: r.transfer
      ? { paired: !!r.transfer.mirrorRecord || r.transfer.type === "paired", mirrorId: r.transfer.mirrorRecord?.id }
      : null,
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
    cardinality: c.cardinality,
    customCategory: c.customCategory ?? false,
    customName: c.customName ?? false,
    parentId: c.parentId,
    parentName: c.parentName,
  };
}

function mapLabel(l: RawLabel): Label {
  return { id: l.id!, name: l.name!, color: l.color, archived: l.archived ?? false };
}

function mapBudget(b: RawBudget): Budget {
  return {
    id: b.id!,
    name: b.name!,
    type: b.type ?? "BUDGET_INTERVAL_MONTH",
    currencyCode: b.currencyCode ?? "USD",
    limit: b.limit ?? null,
    closed: b.closed ?? false,
    startDate: b.startDate,
    endDate: b.endDate,
    accountIds: b.accountIds ?? [],
    categoryIds: b.categoryIds ?? [],
    labelIds: b.labelIds ?? [],
  };
}

function mapStandingOrder(o: RawStandingOrder): StandingOrder {
  return {
    id: o.id!,
    name: o.name ?? "",
    type: o.type ?? "expense",
    amount: Math.abs(o.amount ?? 0),
    currencyCode: o.currencyCode ?? "USD",
    accountId: o.accountId,
    categoryId: o.categoryId,
    counterParty: o.counterParty,
    note: o.note,
    dueDate: o.dueDate,
    recurrenceRule: o.recurrenceRule,
    manualPayment: o.manualPayment ?? false,
    paymentCount: o.paymentCount ?? 0,
    labels: (o.labels ?? []).map((l) => ({ id: l.id!, name: l.name!, color: l.color })),
  };
}

function mapStandingOrderItem(i: RawStandingOrderItem): StandingOrderItem {
  return {
    id: i.id!,
    standingOrderId: i.standingOrderId!,
    originalDate: i.originalDate!,
    paidDate: i.paidDate,
    dismissed: i.dismissed ?? false,
    recordIds: i.recordIds ?? [],
  };
}

// ── Batch write results ───────────────────────────────────────────────────────
// Every write endpoint answers with per-item results; a 400 means all items
// failed but still carries the same body, so it is read rather than thrown.

type BatchBody = { results?: { success?: boolean; error?: string; inputIndex?: number }[] };

/** Error text for the failed items in a batch response, or null when every item succeeded. */
export function batchError(body: BatchBody): string | null {
  const failed = (body.results ?? []).filter((r) => r.success === false);
  if (failed.length === 0) return null;
  const messages = [...new Set(failed.map((r) => r.error ?? "Unknown error"))];
  return failed.length === 1 ? messages[0] : `${failed.length} items failed: ${messages.join("; ")}`;
}

/** Splits a list into API-sized batches (most write endpoints accept 10 items). */
export function chunk<T>(items: T[], size = 10): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ── Client factory ────────────────────────────────────────────────────────────

const BASE = "https://rest.budgetbakers.com/wallet/v1/api";

export function createWalletClient(token: string) {
  const http = axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}` },
  });

  async function write<T extends BatchBody>(method: "post" | "patch" | "delete", url: string, body: unknown, params?: object) {
    const { data, status } = await http.request<T & { message?: string }>({
      method,
      url,
      data: body,
      params,
      validateStatus: (s) => s < 500,
    });
    if (status >= 400 && !data.results) throw new Error(data.message ?? `Request failed with status ${status}`);
    return data;
  }

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

    async getLabels(params?: GetLabelsParams): Promise<{ labels: Label[] }> {
      const { data } = await http.get<{ labels?: RawLabel[] }>("/labels", { params });
      return { labels: (data.labels ?? []).map(mapLabel) };
    },

    async getBudgets(params?: GetBudgetsParams): Promise<{ budgets: Budget[] }> {
      const { data } = await http.get<{ budgets?: RawBudget[] }>("/budgets", { params });
      return { budgets: (data.budgets ?? []).map(mapBudget) };
    },

    async getStandingOrders(params?: GetStandingOrdersParams): Promise<{ standingOrders: StandingOrder[]; nextOffset?: number }> {
      const { data } = await http.get<{ standingOrders?: RawStandingOrder[]; nextOffset?: number }>("/standing-orders", { params });
      return {
        standingOrders: (data.standingOrders ?? []).map(mapStandingOrder),
        nextOffset: data.nextOffset,
      };
    },

    async getStandingOrderItems(params?: GetStandingOrderItemsParams): Promise<{ items: StandingOrderItem[]; nextOffset?: number }> {
      const { data } = await http.get<{ standingOrderItems?: RawStandingOrderItem[]; nextOffset?: number }>("/standing-orders/items", { params });
      return {
        items: (data.standingOrderItems ?? []).map(mapStandingOrderItem),
        nextOffset: data.nextOffset,
      };
    },

    createRecords(records: CreateRecordRequest[]) {
      return write("post", "/records", records, { returnData: false });
    },

    patchRecords(items: PatchRecordItem[]) {
      return write("patch", "/records", items, { returnData: false, validation: "strict" });
    },

    patchAccounts(items: PatchAccountItem[]) {
      return write("patch", "/accounts", items, { returnData: false });
    },

    patchCategories(items: PatchCategoryItem[]) {
      return write("patch", "/categories", items, { returnData: false });
    },

    async createSubcategory(body: CreateSubcategoryRequest) {
      const { data } = await http.post("/categories/custom", body);
      return data;
    },

    patchLabels(items: PatchLabelItem[]) {
      return write("patch", "/labels", items, { returnData: false });
    },

    async createLabel(body: CreateLabelRequest) {
      const { data } = await http.post<components["schemas"]["CreateLabelResponse"]>("/labels", body);
      return data;
    },

    patchBudgets(items: PatchBudgetItem[]) {
      return write("patch", "/budgets", items, { returnData: false });
    },

    deleteEntities(type: DeletableType, ids: string[]) {
      return write("delete", `/${type}`, { ids });
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
