"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type Period = "3m" | "6m" | "1y" | "all";

// A pixel width has no relationship to how wide the viewport actually is —
// persisted from a desktop session, it can exceed a phone's entire screen,
// so the sidebar is sized as a *percentage* of the available space instead.
// Percentages are inherently safe at any viewport width, with no client
// measurement (and its "window.innerWidth reads 0 for a moment" pitfalls)
// required.
const SIDEBAR_WIDTH_STORAGE_KEY = "wallet_sidebar_percent";
export const SIDEBAR_PERCENT_DEFAULT = 20;
export const SIDEBAR_PERCENT_MIN = 15;
export const SIDEBAR_PERCENT_MAX = 50;

type DashboardContextValue = {
  token: string;
  period: Period;
  setPeriod: (p: Period) => void;
  searchInput: string;
  setSearchInput: (v: string) => void;
  debouncedSearch: string;
  handleSave: (t: string) => void;
  handleDisconnect: () => void;
  invalidateAll: () => void;
  sidebarWidthPercent: number;
  setSidebarWidthPercent: (percent: number) => void;
};

function getInitialSidebarWidthPercent() {
  if (typeof window === "undefined") return SIDEBAR_PERCENT_DEFAULT;
  const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
  return stored >= SIDEBAR_PERCENT_MIN && stored <= SIDEBAR_PERCENT_MAX ? stored : SIDEBAR_PERCENT_DEFAULT;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within a DashboardProvider.");
  return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [period, setPeriod] = useState<Period>("3m");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Lazy-initialized (not restored in an effect) so the resizable Panel's
  // `defaultSize` — which only ever applies at mount — sees the persisted
  // width on the very first render. This can mismatch the server-rendered
  // HTML (which has no localStorage) for one paint; React just patches the
  // inline style to match, the same accepted trade-off any "restore a UI
  // preference from localStorage" pattern makes. The alternative — restoring
  // via an effect and remounting the Panel once ready — was tried and
  // discarded: remounting ResizablePanelGroup this soon after its initial
  // mount left it permanently stuck unable to measure itself.
  const [sidebarWidthPercent, setSidebarWidthPercentState] = useState(getInitialSidebarWidthPercent);

  useEffect(() => {
    const t = localStorage.getItem("wallet_token") ?? "";
    if (t) setToken(t);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleSave(t: string) {
    localStorage.setItem("wallet_token", t);
    setToken(t);
  }

  function handleDisconnect() {
    localStorage.removeItem("wallet_token");
    setToken("");
    queryClient.clear();
    router.push("/");
  }

  function setSidebarWidthPercent(percent: number) {
    const clamped = Math.min(SIDEBAR_PERCENT_MAX, Math.max(SIDEBAR_PERCENT_MIN, percent));
    setSidebarWidthPercentState(clamped);
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clamped));
  }

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["records", token] });
    queryClient.invalidateQueries({ queryKey: ["allRecords", token] });
    queryClient.invalidateQueries({ queryKey: ["accounts", token] });
    queryClient.invalidateQueries({ queryKey: ["stats", token] });
  }

  return (
    <DashboardContext.Provider
      value={{
        token,
        period,
        setPeriod,
        searchInput,
        setSearchInput,
        debouncedSearch,
        handleSave,
        handleDisconnect,
        invalidateAll,
        sidebarWidthPercent,
        setSidebarWidthPercent,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
