"use server";

import axios from "axios";
import { createWalletClient, batchError, chunk } from "@/lib/wallet-client";
import type {
  CreateRecordRequest,
  PatchRecordItem,
  PatchAccountItem,
  PatchCategoryItem,
  CreateSubcategoryRequest,
  PatchLabelItem,
  CreateLabelRequest,
  PatchBudgetItem,
  DeletableType,
} from "@/lib/wallet-client";
export type { Account, WalletRecord, Category, Label, Budget, ApiStats, WalletColor } from "@/lib/wallet-client";

/** Result of a write action. Errors are returned, not thrown, so their text survives production builds. */
export type WriteResult = { error: string | null };

function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string; message?: string } | undefined;
    return data?.error ?? data?.message ?? e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

/** Runs batch writes of up to 10 items each, stopping at the first batch that reports a failure. */
async function writeBatches<T>(items: T[], send: (batch: T[]) => Promise<Parameters<typeof batchError>[0]>): Promise<WriteResult> {
  try {
    for (const batch of chunk(items)) {
      const error = batchError(await send(batch));
      if (error) return { error };
    }
    return { error: null };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

async function writeOne(send: () => Promise<unknown>): Promise<WriteResult> {
  try {
    await send();
    return { error: null };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function fetchAccounts(token: string) {
  const client = createWalletClient(token);
  const all: Awaited<ReturnType<typeof client.getAccounts>>["accounts"] = [];
  let offset = 0;
  while (true) {
    const { accounts, nextOffset } = await client.getAccounts({ limit: 200, offset });
    all.push(...accounts);
    if (!nextOffset || accounts.length === 0) break;
    offset = nextOffset;
  }
  return all;
}

export async function fetchRecords(
  token: string,
  opts: { accountId?: string; from?: string; offset?: number; limit?: number; note?: string; counterParty?: string } = {}
) {
  const { accountId, from, offset = 0, limit = 200, note, counterParty } = opts;
  const client = createWalletClient(token);
  const { records, nextOffset } = await client.getRecords({
    limit,
    offset,
    ...(accountId ? { accountId } : {}),
    ...(from ? { recordDate: `gte.${from}` } : {}),
    ...(note ? { note: `contains-i.${note}` } : {}),
    ...(counterParty ? { counterParty: `contains-i.${counterParty}` } : {}),
  });
  return { records, nextOffset: nextOffset ?? null };
}

export async function fetchApiStats(token: string) {
  return createWalletClient(token).getStats();
}

export async function fetchCategories(token: string) {
  const { categories } = await createWalletClient(token).getCategories({ limit: 200 });
  return categories;
}

export async function fetchLabels(token: string) {
  const { labels } = await createWalletClient(token).getLabels({ limit: 200 });
  return labels;
}

export async function fetchBudgets(token: string) {
  const { budgets } = await createWalletClient(token).getBudgets({ limit: 200 });
  return budgets;
}

export async function createRecords(token: string, records: CreateRecordRequest[]) {
  const client = createWalletClient(token);
  return writeBatches(records, (batch) => client.createRecords(batch));
}

export async function patchRecords(token: string, items: PatchRecordItem[]) {
  const client = createWalletClient(token);
  return writeBatches(items, (batch) => client.patchRecords(batch));
}

export async function patchAccounts(token: string, items: PatchAccountItem[]) {
  const client = createWalletClient(token);
  return writeBatches(items, (batch) => client.patchAccounts(batch));
}

export async function patchCategories(token: string, items: PatchCategoryItem[]) {
  const client = createWalletClient(token);
  return writeBatches(items, (batch) => client.patchCategories(batch));
}

export async function createSubcategory(token: string, body: CreateSubcategoryRequest) {
  return writeOne(() => createWalletClient(token).createSubcategory(body));
}

export async function patchLabels(token: string, items: PatchLabelItem[]) {
  const client = createWalletClient(token);
  return writeBatches(items, (batch) => client.patchLabels(batch));
}

export async function createLabel(token: string, body: CreateLabelRequest): Promise<WriteResult & { id?: string }> {
  try {
    const { label } = await createWalletClient(token).createLabel(body);
    return { error: null, id: label?.id };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function patchBudgets(token: string, items: PatchBudgetItem[]) {
  const client = createWalletClient(token);
  return writeBatches(items, (batch) => client.patchBudgets(batch));
}

export async function deleteEntities(token: string, type: DeletableType, ids: string[]) {
  const client = createWalletClient(token);
  return writeBatches(ids, (batch) => client.deleteEntities(type, batch));
}

/**
 * Deletes records given as groups: a paired transfer's two legs must share a
 * request, so groups are packed whole into batches of up to 10 ids.
 */
export async function deleteRecords(token: string, groups: string[][]) {
  const batches: string[][] = [];
  for (const group of groups) {
    const last = batches[batches.length - 1];
    if (last && last.length + group.length <= 10) last.push(...group);
    else batches.push([...group]);
  }
  const client = createWalletClient(token);
  try {
    for (const batch of batches) {
      const error = batchError(await client.deleteEntities("records", batch));
      if (error) return { error };
    }
    return { error: null };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
