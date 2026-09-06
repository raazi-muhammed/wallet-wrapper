"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type Period = "3m" | "6m" | "1y" | "all";

const SIDEBAR_WIDTH_STORAGE_KEY = "wallet_sidebar_width";
export const SIDEBAR_WIDTH_DEFAULT = 256;
export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 420;

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
  sidebarWidth: number;
  setSidebarWidth: (px: number) => void;
};

function getInitialSidebarWidth() {
  if (typeof window === "undefined") return SIDEBAR_WIDTH_DEFAULT;
  const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
  return stored >= SIDEBAR_WIDTH_MIN && stored <= SIDEBAR_WIDTH_MAX ? stored : SIDEBAR_WIDTH_DEFAULT;
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
  const [sidebarWidth, setSidebarWidthState] = useState(getInitialSidebarWidth);

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

  function setSidebarWidth(px: number) {
    const clamped = Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, px));
    setSidebarWidthState(clamped);
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
        sidebarWidth,
        setSidebarWidth,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
