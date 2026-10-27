"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { prefetchDashboardData, type Period } from "@/hooks/use-wallet-data";

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

const TOKEN_STORAGE_KEY = "wallet_token";
const TOKEN_CHANGE_EVENT = "wallet-token-change";

function subscribeToToken(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(TOKEN_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(TOKEN_CHANGE_EVENT, onChange);
  };
}

function writeToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event(TOKEN_CHANGE_EVENT));
}

type DashboardContextValue = {
  token: string;
  /** False until the stored token has been read (server render and hydration); views show a loading state, not the connect form, until then. */
  tokenReady: boolean;
  period: Period;
  setPeriod: (p: Period) => void;
  handleSave: (t: string) => void;
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

function parseSidebarWidthPercent(stored: string | undefined) {
  const percent = Number(stored);
  return percent >= SIDEBAR_PERCENT_MIN && percent <= SIDEBAR_PERCENT_MAX ? percent : SIDEBAR_PERCENT_DEFAULT;
}

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
  storedSidebarWidth,
  children,
}: {
  /** The raw sidebar width cookie, read by the (server) dashboard layout. */
  storedSidebarWidth?: string;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  // The server has no localStorage, so its snapshot is null ("not read yet").
  // React renders that during hydration — matching the server HTML — then
  // re-renders straight away with the stored token.
  const storedToken = useSyncExternalStore(
    subscribeToToken,
    () => localStorage.getItem(TOKEN_STORAGE_KEY) ?? "",
    () => null
  );
  const token = storedToken ?? "";
  const tokenReady = storedToken !== null;
  const [period, setPeriod] = useState<Period>("3m");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Only applied at mount (the Group's `defaultLayout`), so drags persist to
  // the cookie without updating state — re-rendering every consumer per drag
  // frame would make resizing janky.
  const [sidebarWidthPercent] = useState(() => parseSidebarWidthPercent(storedSidebarWidth));

  // The fetches don't need to wait for the token to reach the views: kick
  // them off while hydrating so the queries find them already in flight.
  useState(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (t) prefetchDashboardData(queryClient, t);
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Memoized so consumers only re-render when the token or period changes.
  const value = useMemo<DashboardContextValue>(() => {
    const invalidate = (...keys: string[]) => {
      for (const key of keys) queryClient.invalidateQueries({ queryKey: [key, token] });
    };
    return {
      token,
      tokenReady,
      period,
      setPeriod,
      handleSave(t: string) {
        prefetchDashboardData(queryClient, t);
        writeToken(t);
      },
      handleDisconnect() {
        writeToken(null);
        queryClient.clear();
        router.push("/");
      },
      invalidateAll: () =>
        invalidate(
          "records", "allRecords", "accounts", "stats", "search",
          "categories", "labels", "budgets", "standingOrders", "standingOrderItems",
        ),
      invalidateRecords: () => invalidate("records", "allRecords", "accounts", "stats", "search", "standingOrderItems"),
      invalidateBudgets: () => invalidate("budgets"),
      sidebarWidthPercent,
      setSidebarWidthPercent(percent: number) {
        const clamped = Math.min(SIDEBAR_PERCENT_MAX, Math.max(SIDEBAR_PERCENT_MIN, percent));
        document.cookie = `${SIDEBAR_WIDTH_COOKIE}=${clamped}; path=/; max-age=31536000; samesite=lax`;
      },
    };
  }, [token, tokenReady, period, sidebarWidthPercent, queryClient, router]);

  const search = useMemo(() => ({ searchInput, setSearchInput, debouncedSearch }), [searchInput, debouncedSearch]);

  return (
    <DashboardContext.Provider value={value}>
      <DashboardSearchContext.Provider value={search}>{children}</DashboardSearchContext.Provider>
    </DashboardContext.Provider>
  );
}
