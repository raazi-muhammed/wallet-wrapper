"use client";

import { infiniteQueryOptions, queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLabel } from "@/app/actions";
import {
  fetchAccounts,
  fetchBudgets,
  fetchCategories,
  fetchLabels,
  fetchRecords,
  fetchStandingOrderItems,
  fetchStandingOrders,
  type AccountsData,
} from "@/lib/wallet-fetch";
import { queryKeys } from "@/lib/query-keys";
import { unwrap } from "@/app/components/EditControls";

export type Period = "3m" | "6m" | "1y" | "all";

export function periodFrom(period: Period) {
  if (period === "all") return "2000-01-01";
  const d = new Date();
  if (period === "3m") d.setMonth(d.getMonth() - 3);
  else if (period === "6m") d.setMonth(d.getMonth() - 6);
  else if (period === "1y") d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}

// Shared query definitions, so prefetches and the components that read them use identical keys.

// Accounts and API stats arrive in one response; these two read their half of it.
const selectAccounts = (data: AccountsData) => data.accounts;
const selectStats = (data: AccountsData) => data.stats;

const accountsDataQuery = (session: string) =>
  queryOptions({
    queryKey: queryKeys.accounts(session),
    queryFn: fetchAccounts,
    enabled: !!session,
  });

export const accountsQuery = (session: string) => queryOptions({ ...accountsDataQuery(session), select: selectAccounts });

export const statsQuery = (session: string) => queryOptions({ ...accountsDataQuery(session), select: selectStats });

export const categoriesQuery = (session: string) =>
  queryOptions({
    queryKey: queryKeys.categories(session),
    queryFn: fetchCategories,
    enabled: !!session,
  });

export const labelsQuery = (session: string) =>
  queryOptions({
    queryKey: queryKeys.labels(session),
    queryFn: fetchLabels,
    enabled: !!session,
  });

export const budgetsQuery = (session: string) =>
  queryOptions({
    queryKey: queryKeys.budgets(session),
    queryFn: fetchBudgets,
    enabled: !!session,
  });

export const standingOrdersQuery = (session: string) =>
  queryOptions({
    queryKey: queryKeys.standingOrders(session),
    queryFn: fetchStandingOrders,
    enabled: !!session,
  });

/** Occurrences of every standing order from `from` (ISO date) on. */
export const standingOrderItemsQuery = (session: string, from: string) =>
  queryOptions({
    queryKey: queryKeys.standingOrderItems(session, from),
    queryFn: () => fetchStandingOrderItems(`${from}T00:00:00Z`),
    enabled: !!session,
  });

export const recordsQuery = (session: string, accountId: string | undefined, period: Period) =>
  infiniteQueryOptions({
    queryKey: queryKeys.records(session, accountId, period),
    queryFn: ({ pageParam }) =>
      fetchRecords({
        accountId,
        from: periodFrom(period),
        offset: pageParam,
        limit: 200,
      }),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    initialPageParam: 0,
    enabled: !!session,
  });

export function useCategories(session: string) {
  return useQuery(categoriesQuery(session));
}

export function useLabels(session: string) {
  return useQuery(labelsQuery(session));
}

/** Returns a callback suited to LabelSelect's `onCreate`: creates the label, refreshes the list, then reports the new id. */
export function useCreateLabel(session: string, onCreated?: (id: string) => void) {
  const queryClient = useQueryClient();
  return async (name: string) => {
    const result = await createLabel({ name });
    unwrap(result);
    await queryClient.invalidateQueries({ queryKey: queryKeys.labels(session) });
    if (result.id) onCreated?.(result.id);
  };
}
