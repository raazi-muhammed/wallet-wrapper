"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCategories, fetchLabels, createLabel } from "@/app/actions";
import { unwrap } from "@/app/components/EditControls";

export function useCategories(token: string) {
  return useQuery({
    queryKey: ["categories", token],
    queryFn: () => fetchCategories(token),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });
}

export function useLabels(token: string) {
  return useQuery({
    queryKey: ["labels", token],
    queryFn: () => fetchLabels(token),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });
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
