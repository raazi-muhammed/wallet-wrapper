"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { connect, disconnect } from "@/app/actions";
import type { Period } from "@/hooks/use-wallet-data";
import { queryKeys, type QueryResource } from "@/lib/query-keys";
import { fetchApiStats, type AccountsData } from "@/lib/wallet-fetch";

// A pixel width has no relationship to how wide the viewport actually is —
// persisted from a desktop session, it can exceed a phone's entire screen,
// so the sidebar is sized as a *percentage* of the available space instead.
// Percentages are inherently safe at any viewport width, with no client
// measurement (and its "window.innerWidth reads 0 for a moment" pitfalls)
// required. It's kept in a cookie, not localStorage, so the server renders
// the panels at the same width the client hydrates with.
const SIDEBAR_WIDTH_COOKIE = "wallet_sidebar_percent";
export const SIDEBAR_PERCENT_DEFAULT = 20;
export const SIDEBAR_PERCENT_MIN = 15;
export const SIDEBAR_PERCENT_MAX = 50;

// Where the token was kept before it moved to an httpOnly cookie. A token
// found here is handed to the server once, then removed.
const LEGACY_TOKEN_STORAGE_KEY = "wallet_token";

// Returning to the tab asks the API whether anything changed (one cheap request)
// instead of refetching every query. Checks are spaced out to spare the rate limit.
const REVISION_CHECK_INTERVAL = 60_000;

type DashboardContextValue = {
  /** A non-secret key for the connected token (empty when not connected). Query keys are scoped by it. */
  session: string;
  /** The connected token with its middle hidden, for display. */
  maskedToken: string;
  /** False until it's known whether a token is connected; views show a loading state, not the connect form, until then. */
  tokenReady: boolean;
  period: Period;
  setPeriod: (p: Period) => void;
  handleSave: (t: string) => Promise<void>;
  handleDisconnect: () => void;
  invalidateAll: () => void;
  /** Refreshes what a record change can affect: record lists, search, balances and planned payment status. */
  invalidateRecords: () => void;
  invalidateBudgets: () => void;
  sidebarWidthPercent: number;
  setSidebarWidthPercent: (percent: number) => void;
};

type DashboardSearchValue = {
  searchInput: string;
  setSearchInput: (v: string) => void;
  debouncedSearch: string;
};

const ALL_RESOURCES = Object.keys(queryKeys) as QueryResource[];

function parseSidebarWidthPercent(stored: string | undefined) {
  const percent = Number(stored);
  return percent >= SIDEBAR_PERCENT_MIN && percent <= SIDEBAR_PERCENT_MAX ? percent : SIDEBAR_PERCENT_DEFAULT;
}

const noSubscription = () => () => {};

const DashboardContext = createContext<DashboardContextValue | null>(null);
// Search lives in its own context: it changes on every keystroke, and only the
// records view reads it.
const DashboardSearchContext = createContext<DashboardSearchValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within a DashboardProvider.");
  return ctx;
}

export function useDashboardSearch() {
  const ctx = useContext(DashboardSearchContext);
  if (!ctx) throw new Error("useDashboardSearch must be used within a DashboardProvider.");
  return ctx;
}

export function DashboardProvider({
  session,
  maskedToken,
  storedSidebarWidth,
  children,
}: {
  /** From the token cookie, read by the (server) dashboard layout. */
  session: string;
  maskedToken: string;
  /** The raw sidebar width cookie, read by the (server) dashboard layout. */
  storedSidebarWidth?: string;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  // The server has no localStorage, so its snapshot is null ("not read yet"),
  // which keeps the hydration render identical to the server HTML.
  const hasLegacyToken = useSyncExternalStore(
    noSubscription,
    () => !!localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY),
    () => null
  );
  const tokenReady = !!session || hasLegacyToken === false;
  const [period, setPeriod] = useState<Period>("3m");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Only applied at mount (the Group's `defaultLayout`), so drags persist to
  // the cookie without updating state — re-rendering every consumer per drag
  // frame would make resizing janky.
  const [sidebarWidthPercent] = useState(() => parseSidebarWidthPercent(storedSidebarWidth));

  useEffect(() => {
    if (!hasLegacyToken) return;
    if (session) {
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
      return;
    }
    const legacy = localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
    if (legacy) void connect(legacy);
  }, [hasLegacyToken, session]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const invalidate = useCallback(
    (...resources: QueryResource[]) => {
      for (const resource of resources) queryClient.invalidateQueries({ queryKey: [resource, session] });
    },
    [queryClient, session]
  );

  useEffect(() => {
    if (!session) return;
    const accountsKey = queryKeys.accounts(session);
    let lastCheck = Date.now();
    async function checkRevision() {
      if (document.visibilityState !== "visible" || Date.now() - lastCheck < REVISION_CHECK_INTERVAL) return;
      lastCheck = Date.now();
      // Accounts fetched this recently already carry a current revision.
      const updatedAt = queryClient.getQueryState(accountsKey)?.dataUpdatedAt ?? 0;
      if (Date.now() - updatedAt < REVISION_CHECK_INTERVAL) return;
      const stats = await fetchApiStats().catch(() => null);
      if (!stats) return;
      const known = queryClient.getQueryData<AccountsData>(accountsKey)?.stats?.lastDataChangeRev;
      if (stats.lastDataChangeRev && stats.lastDataChangeRev === known) {
        // Nothing changed: keep the cache, and show the fresh rate limit.
        queryClient.setQueryData<AccountsData>(accountsKey, (data) => data && { ...data, stats });
      } else {
        invalidate(...ALL_RESOURCES);
      }
    }
    window.addEventListener("focus", checkRevision);
    document.addEventListener("visibilitychange", checkRevision);
    return () => {
      window.removeEventListener("focus", checkRevision);
      document.removeEventListener("visibilitychange", checkRevision);
    };
  }, [session, queryClient, invalidate]);

  // Memoized so consumers only re-render when the session or period changes.
  const value = useMemo<DashboardContextValue>(
    () => ({
      session,
      maskedToken,
      tokenReady,
      period,
      setPeriod,
      handleSave(t: string) {
        // The cookie is set and the layout re-rendered with the new account's data in one round trip.
        queryClient.clear();
        return connect(t);
      },
      handleDisconnect() {
        void disconnect().then(() => {
          queryClient.clear();
          router.push("/");
        });
      },
      invalidateAll: () => invalidate(...ALL_RESOURCES),
      invalidateRecords: () => invalidate("records", "accounts", "search", "standingOrderItems"),
      invalidateBudgets: () => invalidate("budgets"),
      sidebarWidthPercent,
      setSidebarWidthPercent(percent: number) {
        const clamped = Math.min(SIDEBAR_PERCENT_MAX, Math.max(SIDEBAR_PERCENT_MIN, percent));
        document.cookie = `${SIDEBAR_WIDTH_COOKIE}=${clamped}; path=/; max-age=31536000; samesite=lax`;
      },
    }),
    [session, maskedToken, tokenReady, period, sidebarWidthPercent, queryClient, router, invalidate]
  );

  const search = useMemo(() => ({ searchInput, setSearchInput, debouncedSearch }), [searchInput, debouncedSearch]);

  return (
    <DashboardContext.Provider value={value}>
      <DashboardSearchContext.Provider value={search}>{children}</DashboardSearchContext.Provider>
    </DashboardContext.Provider>
  );
}
