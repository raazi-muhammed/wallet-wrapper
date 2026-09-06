"use client";

import { useState, useEffect } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  ArrowLeft01Icon,
  Settings01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { fetchAccounts, fetchRecords, fetchApiStats } from "../actions";
import type { Account, WalletRecord, ApiStats } from "../actions";
import { getCategoryIcon, getAccountIcon } from "@/lib/utils";
import { AddRecordButton, RecordDetailModal, DuplicateRecordModal } from "./AddRecordModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TokenConnectForm } from "./TokenConnectForm";
import { useDashboard } from "./DashboardProvider";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number | undefined, currency: string | undefined) {
  if (amount == null || !currency) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function periodFrom(period: "3m" | "6m" | "1y" | "all") {
  if (period === "all") return "2000-01-01";
  const d = new Date();
  if (period === "3m") d.setMonth(d.getMonth() - 3);
  else if (period === "6m") d.setMonth(d.getMonth() - 6);
  else if (period === "1y") d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}

const PERIOD_LABELS: Record<"3m" | "6m" | "1y" | "all", string> = {
  "3m": "3 months",
  "6m": "6 months",
  "1y": "1 year",
  all: "all time",
};

// ── Settings Popover ──────────────────────────────────────────────────────────

function SettingsPopover({
  token,
  stats,
  period,
  setPeriod,
  onSave,
  onDisconnect,
}: {
  token: string;
  stats: ApiStats | null;
  period: "3m" | "6m" | "1y" | "all";
  setPeriod: (p: "3m" | "6m" | "1y" | "all") => void;
  onSave: (t: string) => void;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(token);
  const { theme, setTheme } = useTheme();

  useEffect(() => { setDraft(token); }, [token]);

  const used = stats ? stats.rateLimit - stats.rateLimitRemaining : null;
  const pct = stats ? Math.round((used! / stats.rateLimit) * 100) : null;

  function handleSaveAndClose(t: string) {
    onSave(t);
    setOpen(false);
  }

  function handleDisconnectAndClose() {
    onDisconnect();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Settings"
          className="flex items-center justify-center size-10 rounded-full bg-default hover:bg-default-hover text-muted transition-colors"
        >
          <HugeiconsIcon icon={Settings01Icon} className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-base">Settings</DialogTitle>
        </DialogHeader>

        <div className="px-4 sm:px-6 py-5 space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">API Connection</p>
            <div className="rounded-xl bg-card p-4 space-y-3">
              <input
                type="password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && draft && handleSaveAndClose(draft)}
                placeholder="Paste your bearer token…"
                className="w-full rounded-lg border border-border bg-background text-foreground placeholder:text-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveAndClose(draft)}
                  disabled={!draft}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  Connect
                </button>
                {token && (
                  <button
                    onClick={handleDisconnectAndClose}
                    className="px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted hover:text-danger hover:border-danger transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Period</p>
            <div className="rounded-xl overflow-hidden bg-card">
              {([
                { id: "3m", label: "3 Months" },
                { id: "6m", label: "6 Months" },
                { id: "1y", label: "1 Year" },
                { id: "all", label: "All Time" },
              ] as const).map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm text-foreground hover:bg-default-hover transition-colors ${
                    idx > 0 ? "border-t border-separator" : ""
                  }`}
                >
                  {p.label}
                  {period === p.id && <HugeiconsIcon icon={Tick02Icon} className="size-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "system", label: "System" },
                { id: "light", label: "Light" },
                { id: "dark", label: "Dark" },
              ] as const).map((t) => {
                const selected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={`relative w-full aspect-video rounded-xl overflow-hidden border-2 transition-colors ${
                        selected ? "border-primary" : "border-border"
                      }`}
                    >
                      {t.id === "system" ? (
                        <div className="absolute inset-0 flex">
                          <div className="flex-1 flex items-center justify-center" style={{ background: "#0a0a0a" }}>
                            <span className="px-2 py-0.5 rounded-full border border-white/30 text-white text-[9px] font-semibold">Aa</span>
                          </div>
                          <div className="flex-1 flex items-center justify-center" style={{ background: "#e8e8e8" }}>
                            <span className="px-2 py-0.5 rounded-full bg-white text-black text-[9px] font-semibold shadow-sm">Aa</span>
                          </div>
                        </div>
                      ) : t.id === "light" ? (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#e8e8e8" }}>
                          <span className="px-2 py-0.5 rounded-full bg-white text-black text-[9px] font-semibold shadow-sm">Aa</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0a0a0a" }}>
                          <span className="px-2 py-0.5 rounded-full border border-white/30 text-white text-[9px] font-semibold">Aa</span>
                        </div>
                      )}
                      {selected && (
                        <div className="absolute bottom-1 right-1 size-4 rounded-full bg-primary flex items-center justify-center">
                          <HugeiconsIcon icon={Tick02Icon} className="size-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <span className={`text-xs ${selected ? "text-foreground font-medium" : "text-muted"}`}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {stats && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">API Usage Stats</p>
              <div className="rounded-xl bg-card p-4 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted">
                    <span>Rate limit</span>
                    <span className="font-mono text-foreground">{used} / {stats.rateLimit} req/hr</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-default overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct! > 80 ? "bg-danger" : "bg-success"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-default p-2.5 space-y-0.5">
                    <p className="text-muted">Last change</p>
                    <p className="text-foreground font-medium">
                      {stats.lastDataChangeAt ? fmtRelative(stats.lastDataChangeAt) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-default p-2.5 space-y-0.5">
                    <p className="text-muted">Revision</p>
                    <p className="text-foreground font-medium font-mono">{stats.lastDataChangeRev ?? "—"}</p>
                  </div>
                  <div className="rounded-lg bg-default p-2.5 space-y-0.5 col-span-2">
                    <p className="text-muted">Sync status</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${stats.syncInProgress ? "bg-warning animate-pulse" : "bg-success"}`} />
                      <p className="text-foreground font-medium">{stats.syncInProgress ? "Syncing…" : "Up to date"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Records Table ─────────────────────────────────────────────────────────────

const ICON_BG_COLORS = [
  "bg-pink-500/20 text-pink-400",
  "bg-violet-500/20 text-violet-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-sky-500/20 text-sky-400",
  "bg-amber-500/20 text-amber-400",
  "bg-rose-500/20 text-rose-400",
  "bg-teal-500/20 text-teal-400",
  "bg-indigo-500/20 text-indigo-400",
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function groupByDate(records: WalletRecord[]) {
  const map = new Map<string, WalletRecord[]>();
  for (const r of records) {
    const key = r.recordDate.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries()).map(([date, recs]) => ({ date, records: recs }));
}

function RecordsTable({ records, accounts, highlightedId, onEdit }: { records: WalletRecord[]; accounts: Account[]; highlightedId?: string; onEdit?: (r: WalletRecord) => void }) {
  if (records.length === 0) {
    return <p className="text-center py-12 text-muted text-sm">No records found.</p>;
  }

  const groups = groupByDate(records);
  let rowIndex = -1;

  return (
    <div className="space-y-3">
      {groups.map(({ date, records: dayRecords }) => {
        const currency = dayRecords[0]?.amount.currencyCode;
        const dayTotal = dayRecords.reduce((sum, r) => sum + r.amount.value, 0);
        return (
          <div key={date}>
            <div className="flex items-center justify-between px-4 py-2 bg-background">
              <span className="text-xs font-semibold text-muted">{fmtDateLong(date + "T00:00:00")}</span>
              <span className="text-xs font-mono font-semibold text-muted">
                {dayTotal >= 0 ? "+" : ""}{fmt(dayTotal, currency)}
              </span>
            </div>
            {dayRecords.map((r, i) => {
              rowIndex++;
              const isFirst = i === 0;
              const isLast = i === dayRecords.length - 1;
              const { value, currencyCode } = r.amount;
              const positive = value > 0;
              const highlighted = r.id === highlightedId;
              const categoryIcon = getCategoryIcon(r.category?.name ?? "", r.category?.group?.name);
              const iconColor = ICON_BG_COLORS[hashStr(r.category?.name ?? r.accountName) % ICON_BG_COLORS.length];
              const account = accounts.find((a) => a.id === r.accountId);
              const accountIcon = getAccountIcon(account?.accountType ?? "", r.accountName);
              const accountColor = account?.color ?? "var(--muted-foreground)";
              const cleared = r.recordState === "cleared" || r.recordState === "reconciled";

              return (
                <div
                  key={r.id}
                  data-record-id={r.id}
                  onClick={() => onEdit?.(r)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${rowIndex % 2 === 1 ? "bg-card-2" : "bg-card"} ${isFirst ? "rounded-t-xl" : ""} ${isLast ? "rounded-b-xl" : ""} ${highlighted ? "outline outline-2 outline-accent" : ""}`}
                >
                  <div className="relative shrink-0">
                    <div className={`size-9 rounded-full flex items-center justify-center ${iconColor}`}>
                      <HugeiconsIcon icon={categoryIcon} className="size-4" />
                    </div>
                    {cleared && (
                      <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-success flex items-center justify-center">
                        <svg viewBox="0 0 10 10" className="size-2 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
                    <p className="text-sm font-medium text-foreground truncate">{r.category?.name ?? "—"}</p>
                    <p className="text-xs text-muted truncate sm:hidden">
                      {r.accountName}{r.counterParty ? ` · ${r.counterParty}` : ""}
                    </p>
                    {r.counterParty && <p className="hidden sm:block text-xs text-muted truncate">{r.counterParty}</p>}
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 min-w-0 w-36 shrink-0">
                    <HugeiconsIcon icon={accountIcon} className="size-3.5 shrink-0" style={{ color: accountColor }} />
                    <span className="text-sm text-muted truncate">{r.accountName}</span>
                  </div>

                  <div className="hidden md:block flex-1 min-w-0">
                    <span className="text-sm text-muted truncate block">{r.note ?? ""}</span>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-semibold tabular-nums ${positive ? "text-success" : "text-danger"}`}>
                      {positive ? "+" : ""}{fmt(value, currencyCode)}
                    </p>
                    <p className="text-xs text-muted">{fmtTime(r.recordDate)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function RecordsSkeleton({ counts = [4, 3] }: { counts?: number[] }) {
  let rowIndex = -1;
  return (
    <div className="space-y-3">
      {counts.map((count, gi) => (
        <div key={gi}>
          <div className="flex items-center justify-between px-4 py-2 bg-background">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-14" />
          </div>
          {[...Array(count)].map((_, i) => {
            rowIndex++;
            const isFirst = i === 0;
            const isLast = i === count - 1;
            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${rowIndex % 2 === 1 ? "bg-card-2" : "bg-card"} ${isFirst ? "rounded-t-xl" : ""} ${isLast ? "rounded-b-xl" : ""}`}>
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="w-40 shrink-0 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="w-36 shrink-0">
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
                <div className="flex-1">
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
                <div className="shrink-0 space-y-1.5 text-right">
                  <Skeleton className="h-3.5 w-16 ml-auto" />
                  <Skeleton className="h-3 w-10 ml-auto" />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────

export function AccountRecordsView({ accountId }: { accountId?: string }) {
  const router = useRouter();
  const { token, period, setPeriod, searchInput, setSearchInput, debouncedSearch, handleSave, handleDisconnect, invalidateAll } = useDashboard();
  const [highlightedId, setHighlightedId] = useState<string | undefined>();
  const [editingRecord, setEditingRecord] = useState<WalletRecord | null>(null);
  const [duplicatingRecord, setDuplicatingRecord] = useState<WalletRecord | null>(null);

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts", token],
    queryFn: () => fetchAccounts(token),
    enabled: !!token,
  });

  const { data: allRecords = [] } = useQuery({
    queryKey: ["allRecords", token],
    queryFn: async () => {
      const { records } = await fetchRecords(token, { limit: 200 });
      return records;
    },
    enabled: !!token,
  });

  const { data: stats = null } = useQuery({
    queryKey: ["stats", token],
    queryFn: () => fetchApiStats(token),
    enabled: !!token,
  });

  const {
    data: recordsData,
    isLoading: recordsInitialLoading,
    isFetching: recordsFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["records", token, accountId, period],
    queryFn: ({ pageParam }) =>
      fetchRecords(token, {
        accountId,
        from: periodFrom(period),
        offset: pageParam as number,
        limit: 200,
      }),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    initialPageParam: 0,
    enabled: !!token,
  });

  const isSearching = debouncedSearch.trim().length > 0;

  const { data: searchResults = [], isFetching: searchFetching } = useQuery({
    queryKey: ["search", token, debouncedSearch],
    queryFn: async () => {
      const [noteRes, cpRes] = await Promise.all([
        fetchRecords(token, { from: "2000-01-01", limit: 200, note: debouncedSearch }),
        fetchRecords(token, { from: "2000-01-01", limit: 200, counterParty: debouncedSearch }),
      ]);
      const seen = new Set<string>();
      const merged: WalletRecord[] = [];
      for (const r of [...noteRes.records, ...cpRes.records]) {
        if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
      }
      return merged;
    },
    enabled: !!token && isSearching,
    staleTime: 30_000,
  });

  // ── Navigation ───────────────────────────────────────────────────────────────

  function handleGoToRecord(id: string) {
    const rec = allRecords.find((r) => r.id === id);
    if (rec && rec.accountId !== accountId) {
      router.push(`/account/${rec.accountId}`);
    }
    setHighlightedId(id);
    setTimeout(() => {
      document.querySelector(`[data-record-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    setTimeout(() => setHighlightedId(undefined), 2500);
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const records = recordsData?.pages.flatMap((p) => p.records) ?? [];
  const sorted = (list: WalletRecord[]) =>
    [...list].sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());
  const displayedRecords = sorted(isSearching ? searchResults : records);
  const activeAccounts = accounts.filter((a) => !a.archived);
  const selectedAccountName =
    accountId === undefined
      ? "All Accounts"
      : activeAccounts.find((a) => a.id === accountId)?.name ?? "Records";

  const initialLoading = !!token && (accountsLoading || recordsInitialLoading) && activeAccounts.length === 0;
  const recordsSwitching = !recordsInitialLoading && recordsFetching && !isFetchingNextPage && !isSearching;

  if (!token) {
    return <TokenConnectForm onSave={handleSave} />;
  }

  if (initialLoading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-52" />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
        <RecordsSkeleton counts={[3, 2, 4]} />
      </div>
    );
  }

  if (!(activeAccounts.length > 0 || records.length > 0)) {
    return null;
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
            <button
              onClick={() => router.push("/")}
              aria-label="Back"
              className="md:hidden flex items-center justify-center size-6 -ml-1.5 rounded-full text-muted hover:text-foreground hover:bg-default transition-colors shrink-0"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            </button>
            {selectedAccountName}
          </h2>
          {isSearching && (
            <p className="text-xs text-muted mt-0.5">
              {searchFetching ? "Searching…" : `${displayedRecords.length} result${displayedRecords.length !== 1 ? "s" : ""} for "${debouncedSearch}"`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {token && (
            <AddRecordButton
              token={token}
              accounts={activeAccounts}
              records={allRecords}
              defaultAccountId={accountId}
              onSuccess={invalidateAll}
              onGoToRecord={handleGoToRecord}
              onOpenRecord={setEditingRecord}
            />
          )}
          <SettingsPopover
            token={token}
            stats={stats}
            period={period}
            setPeriod={setPeriod}
            onSave={handleSave}
            onDisconnect={handleDisconnect}
          />
        </div>
      </div>

      {/* Search bar */}
      <div className="relative flex items-center">
        <HugeiconsIcon icon={Search01Icon} className="absolute left-3 size-3.5 text-muted pointer-events-none" />
        <Input
          type="text"
          placeholder="Search by note or payee…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-sm rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:bg-default-hover transition-colors"
        />
        {searchInput && (
          <button onClick={() => setSearchInput("")} className="absolute right-3 text-muted hover:text-foreground">
            <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
          </button>
        )}
      </div>

      {recordsSwitching ? (
        <RecordsSkeleton />
      ) : (
        <RecordsTable
          records={displayedRecords}
          accounts={accounts}
          highlightedId={highlightedId}
          onEdit={setEditingRecord}
        />
      )}

      {!recordsSwitching && !isSearching && hasNextPage && (
        <div className="flex justify-center pt-2 pb-1">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-4 py-2 rounded-lg text-xs font-medium text-muted hover:text-foreground hover:bg-default disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {!recordsSwitching && !isSearching && period !== "all" && (
        <p className="text-center text-xs text-muted pt-1 pb-2">
          Only showing data for the last {PERIOD_LABELS[period]}. Open Settings to change the range.
        </p>
      )}

      {editingRecord && (
        <RecordDetailModal
          record={editingRecord}
          accounts={activeAccounts}
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onDuplicate={() => { setDuplicatingRecord(editingRecord); setEditingRecord(null); }}
        />
      )}
      {duplicatingRecord && (
        <DuplicateRecordModal
          record={duplicatingRecord}
          token={token}
          accounts={activeAccounts}
          records={allRecords}
          isOpen={!!duplicatingRecord}
          onClose={() => setDuplicatingRecord(null)}
          onSuccess={() => { setDuplicatingRecord(null); invalidateAll(); }}
          onGoToRecord={(id) => { setDuplicatingRecord(null); handleGoToRecord(id); }}
          onOpenRecord={(rec) => { setDuplicatingRecord(null); setEditingRecord(rec); }}
        />
      )}
    </div>
  );
}
