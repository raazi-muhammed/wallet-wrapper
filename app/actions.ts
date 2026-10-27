"use server";

import axios from "axios";
import { refresh } from "next/cache";
import { createWalletClient, batchError, chunk } from "@/lib/wallet-client";
import { readToken, writeToken } from "@/lib/session";
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
export type { Account, WalletRecord, Category, Label, Budget, StandingOrder, StandingOrderItem, ApiStats, WalletColor } from "@/lib/wallet-client";

type WalletClient = ReturnType<typeof createWalletClient>;

const NOT_CONNECTED = "Not connected. Add your API token in Settings.";

/** Result of a write action. Errors are returned, not thrown, so their text survives production builds. */
export type WriteResult = { error: string | null };

function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string; message?: string } | undefined;
    return data?.error ?? data?.message ?? e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

/** Batches sent at once. Enough to overlap round trips without bursting through the rate limit. */
const WRITE_CONCURRENCY = 3;

/**
 * Sends batches of up to 10 items, a few at a time. After the first batch that
 * reports a failure no more are started (batches already in flight still finish).
 */
async function runBatches<T>(batches: T[][], send: (client: WalletClient, batch: T[]) => Promise<Parameters<typeof batchError>[0]>): Promise<WriteResult> {
  const token = await readToken();
  if (!token) return { error: NOT_CONNECTED };
  const client = createWalletClient(token);
  let next = 0;
  let error: string | null = null;
  async function worker() {
    while (!error && next < batches.length) {
      const batch = batches[next++];
      try {
        error ??= batchError(await send(client, batch));
      } catch (e) {
        error ??= errorMessage(e);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(WRITE_CONCURRENCY, batches.length) }, worker));
  return { error };
}

async function writeOne(send: (client: WalletClient) => Promise<unknown>): Promise<WriteResult> {
  const token = await readToken();
  if (!token) return { error: NOT_CONNECTED };
  try {
    await send(createWalletClient(token));
    return { error: null };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

/** Stores the token in its httpOnly cookie and re-renders the dashboard with that account's data. */
export async function connect(token: string) {
  await writeToken(token.trim());
  refresh();
}

export async function disconnect() {
  await writeToken(null);
  refresh();
}

export async function createRecords(records: CreateRecordRequest[]) {
  return runBatches(chunk(records), (client, batch) => client.createRecords(batch));
}

export async function patchRecords(items: PatchRecordItem[]) {
  return runBatches(chunk(items), (client, batch) => client.patchRecords(batch));
}

export async function patchAccounts(items: PatchAccountItem[]) {
  return runBatches(chunk(items), (client, batch) => client.patchAccounts(batch));
}

export async function patchCategories(items: PatchCategoryItem[]) {
  return runBatches(chunk(items), (client, batch) => client.patchCategories(batch));
}

export async function createSubcategory(body: CreateSubcategoryRequest) {
  return writeOne((client) => client.createSubcategory(body));
}

export async function patchLabels(items: PatchLabelItem[]) {
  return runBatches(chunk(items), (client, batch) => client.patchLabels(batch));
}

export async function createLabel(body: CreateLabelRequest): Promise<WriteResult & { id?: string }> {
  const token = await readToken();
  if (!token) return { error: NOT_CONNECTED };
  try {
    const { label } = await createWalletClient(token).createLabel(body);
    return { error: null, id: label?.id };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function patchBudgets(items: PatchBudgetItem[]) {
  return runBatches(chunk(items), (client, batch) => client.patchBudgets(batch));
}

export async function deleteEntities(type: DeletableType, ids: string[]) {
  return runBatches(chunk(ids), (client, batch) => client.deleteEntities(type, batch));
}

/**
 * Deletes records given as groups: a paired transfer's two legs must share a
 * request, so groups are packed whole into batches of up to 10 ids.
 */
export async function deleteRecords(groups: string[][]) {
  const batches: string[][] = [];
  for (const group of groups) {
    const last = batches[batches.length - 1];
    if (last && last.length + group.length <= 10) last.push(...group);
    else batches.push([...group]);
  }
  return runBatches(batches, (client, batch) => client.deleteEntities("records", batch));
}
