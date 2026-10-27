import { createWalletClient, type ApiStats } from "@/lib/wallet-client";

// Server-side read helpers, served to the client through app/api/wallet/[resource]/route.ts.
// Reads deliberately aren't Server Actions: Next dispatches those one at a time,
// which would serialize every query on a page.

/** Every account, plus the API stats read off the first page's headers (saves a separate stats request). */
export async function fetchAccounts(token: string) {
  const client = createWalletClient(token);
  const all: Awaited<ReturnType<typeof client.getAccounts>>["accounts"] = [];
  let stats: ApiStats | undefined;
  let offset = 0;
  while (true) {
    const page = await client.getAccounts({ limit: 200, offset });
    stats ??= page.stats;
    all.push(...page.accounts);
    if (!page.nextOffset || page.accounts.length === 0) break;
    offset = page.nextOffset;
  }
  return { accounts: all, stats: stats! };
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

export async function fetchStandingOrders(token: string) {
  const client = createWalletClient(token);
  const all: Awaited<ReturnType<typeof client.getStandingOrders>>["standingOrders"] = [];
  let offset = 0;
  while (true) {
    const { standingOrders, nextOffset } = await client.getStandingOrders({ limit: 200, offset });
    all.push(...standingOrders);
    if (!nextOffset || standingOrders.length === 0) break;
    offset = nextOffset;
  }
  return all;
}

/** Occurrences of every standing order whose original date is on or after `from` (ISO date), excluding dismissed ones. */
export async function fetchStandingOrderItems(token: string, from: string) {
  const client = createWalletClient(token);
  const all: Awaited<ReturnType<typeof client.getStandingOrderItems>>["items"] = [];
  let offset = 0;
  while (true) {
    const { items, nextOffset } = await client.getStandingOrderItems({
      limit: 200,
      offset,
      dismissed: false,
      originalDate: `gte.${from}`,
    });
    all.push(...items);
    if (!nextOffset || items.length === 0) break;
    offset = nextOffset;
  }
  return all;
}
