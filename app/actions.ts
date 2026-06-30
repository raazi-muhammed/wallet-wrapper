"use server";

import { createWalletClient } from "@/lib/wallet-client";
export type { Account, WalletRecord, Category, ApiStats } from "@/lib/wallet-client";

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

export async function createRecords(token: string, records: import("@/lib/wallet-client").CreateRecordRequest[]) {
  return createWalletClient(token).createRecords(records);
}

export async function patchRecord(token: string, id: string, patch: Omit<import("@/lib/wallet-client").PatchRecordItem, "id">) {
  return createWalletClient(token).patchRecord(id, patch);
}
