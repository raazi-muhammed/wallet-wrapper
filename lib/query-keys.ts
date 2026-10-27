// Query keys, shared by the server prefetch in app/(dashboard)/layout.tsx and
// the client queries in hooks/use-wallet-data.ts. Every key starts with its
// resource name and the session key, so invalidating [name, session] covers
// all of that resource's variants.

export const queryKeys = {
  accounts: (session: string) => ["accounts", session] as const,
  categories: (session: string) => ["categories", session] as const,
  labels: (session: string) => ["labels", session] as const,
  budgets: (session: string) => ["budgets", session] as const,
  records: (session: string, accountId: string | undefined, period: string) => ["records", session, accountId, period] as const,
  search: (session: string, query: string) => ["search", session, query] as const,
  standingOrders: (session: string) => ["standingOrders", session] as const,
  standingOrderItems: (session: string, from: string) => ["standingOrderItems", session, from] as const,
};

export type QueryResource = keyof typeof queryKeys;
