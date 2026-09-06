"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type Period = "3m" | "6m" | "1y" | "all";

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
};

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
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
