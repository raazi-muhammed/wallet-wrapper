"use client";

import { infiniteQueryOptions, queryOptions, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createLabel } from "@/app/actions";
import { fetchAccounts, fetchApiStats, fetchCategories, fetchLabels, fetchRecords } from "@/lib/wallet-fetch";
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

export const accountsQuery = (token: string) =>
  queryOptions({
    queryKey: ["accounts", token],
    queryFn: () => fetchAccounts(token),
    enabled: !!token,
  });

export const statsQuery = (token: string) =>
  queryOptions({
    queryKey: ["stats", token],
    queryFn: () => fetchApiStats(token),
    enabled: !!token,
  });

export const categoriesQuery = (token: string) =>
  queryOptions({
    queryKey: ["categories", token],
    queryFn: () => fetchCategories(token),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });

export const labelsQuery = (token: string) =>
  queryOptions({
    queryKey: ["labels", token],
    queryFn: () => fetchLabels(token),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });

export const recordsQuery = (token: string, accountId: string | undefined, period: Period) =>
  infiniteQueryOptions({
    queryKey: ["records", token, accountId, period],
    queryFn: ({ pageParam }) =>
      fetchRecords(token, {
        accountId,
        from: periodFrom(period),
        offset: pageParam,
        limit: 200,
      }),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    initialPageParam: 0,
    enabled: !!token,
  });

/** Starts the fetches every dashboard page needs, so they're in flight before the components mount. */
export function prefetchDashboardData(queryClient: QueryClient, token: string) {
  void queryClient.prefetchQuery(accountsQuery(token));
  void queryClient.prefetchQuery(statsQuery(token));
  void queryClient.prefetchQuery(categoriesQuery(token));
  void queryClient.prefetchQuery(labelsQuery(token));
}

export function useCategories(token: string) {
  return useQuery(categoriesQuery(token));
}

export function useLabels(token: string) {
  return useQuery(labelsQuery(token));
}

/** Returns a callback suited to LabelSelect's `onCreate`: creates the label, refreshes the list, then reports the new id. */
export function useCreateLabel(token: string, onCreated?: (id: string) => void) {
  const queryClient = useQueryClient();
  return async (name: string) => {
    const result = await createLabel(token, { name });
    unwrap(result);
    await queryClient.invalidateQueries({ queryKey: ["labels", token] });
    if (result.id) onCreated?.(result.id);
  };
}
