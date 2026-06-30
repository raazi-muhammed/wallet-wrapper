"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Banknote,
  Landmark,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Shield,
  CircleDashed,
  Globe,
  Gem,
  Building2,
  Search,
  X,
  Info,
  type LucideIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAccounts, fetchRecords, fetchApiStats } from "./actions";
import type { Account, WalletRecord, ApiStats } from "./actions";
import { getCategoryIcon, getAccountIcon } from "@/lib/utils";
import { AddRecordButton, RecordDetailModal, DuplicateRecordModal } from "./components/AddRecordModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ComponentType } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number | undefined, currency: string | undefined) {
  if (amount == null || !currency) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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


// ── Settings Popover ──────────────────────────────────────────────────────────

function SettingsPopover({
  token,
  stats,
  onSave,
  onDisconnect,
}: {
  token: string;
  stats: ApiStats | null;
  onSave: (t: string) => void;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(token);

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
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="API settings"
        className="flex items-center justify-center size-10 rounded-full bg-default hover:bg-default-hover text-muted transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4Z"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-4 right-4 z-50 w-80 rounded-xl shadow-lg space-y-4 p-4" style={{ background: "#0F0F0F" }}>
            <p className="text-sm font-semibold text-foreground">API Connection</p>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted uppercase tracking-widest">Bearer Token</label>
              <input
                type="password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && draft && handleSaveAndClose(draft)}
                placeholder="Paste your token…"
                autoFocus
                className="w-full rounded-lg border border-border bg-background text-foreground placeholder:text-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleSaveAndClose(draft)}
                disabled={!draft}
                className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover disabled:opacity-40 transition-colors"
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

            {stats && (
              <div className="border-t border-separator pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-widest">API Usage Stats</p>

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
            )}
          </div>
        </>
      )}
    </>
  );
}

// ── Token Connect Form ────────────────────────────────────────────────────────

function TokenConnectForm({ onSave }: { onSave: (t: string) => void }) {
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <CircleDashed className="size-10 text-muted" />
        <p className="text-foreground font-medium">Connect your Wallet</p>
        <p className="text-muted text-sm">Paste your Bearer token below to get started.</p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && draft && onSave(draft)}
          placeholder="Paste your Bearer token…"
          autoFocus
          className="w-full rounded-lg border border-border bg-background text-foreground placeholder:text-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={() => onSave(draft)}
          disabled={!draft}
          className="w-full py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent-hover disabled:opacity-40 transition-colors"
        >
          Connect
        </button>
      </div>
    </div>
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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
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

  return (
    <div className="space-y-0 rounded-xl overflow-hidden" style={{ background: "hsl(240 3% 6%)" }}>
      {groups.map(({ date, records: dayRecords }) => {
        const currency = dayRecords[0]?.amount.currencyCode;
        const dayTotal = dayRecords.reduce((sum, r) => sum + r.amount.value, 0);
        return (
          <div key={date}>
            <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04]">
              <span className="text-xs font-semibold text-muted">{fmtDateLong(date + "T00:00:00")}</span>
              <span className={`text-xs font-mono font-semibold ${dayTotal >= 0 ? "text-success" : "text-danger"}`}>
                {dayTotal >= 0 ? "+" : ""}{fmt(dayTotal, currency)}
              </span>
            </div>
            {dayRecords.map((r) => {
              const { value, currencyCode } = r.amount;
              const positive = value > 0;
              const highlighted = r.id === highlightedId;
              const Icon = getCategoryIcon(r.category?.name ?? "", r.category?.group?.name);
              const iconColor = ICON_BG_COLORS[hashStr(r.category?.name ?? r.accountName) % ICON_BG_COLORS.length];
              const account = accounts.find((a) => a.id === r.accountId);
              const AccountIcon = getAccountIcon(account?.accountType ?? "", r.accountName);
              const accountColor = account?.color ?? "var(--muted-foreground)";
              const cleared = r.recordState === "cleared" || r.recordState === "reconciled";

              return (
                <div
                  key={r.id}
                  data-record-id={r.id}
                  onClick={() => onEdit?.(r)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-t border-white/[0.04] bg-white/[0.03] hover:bg-white/[0.07] transition-colors ${highlighted ? "outline outline-2 outline-accent" : ""}`}
                >
                  <div className="relative shrink-0">
                    <div className={`size-9 rounded-full flex items-center justify-center ${iconColor}`}>
                      <Icon className="size-4" />
                    </div>
                    {cleared && (
                      <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-success flex items-center justify-center">
                        <svg viewBox="0 0 10 10" className="size-2 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 w-40 shrink-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.category?.name ?? "—"}</p>
                    {r.counterParty && <p className="text-xs text-muted truncate">{r.counterParty}</p>}
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0 w-36 shrink-0">
                    <AccountIcon weight="fill" className="size-3.5 shrink-0" style={{ color: accountColor }} />
                    <span className="text-sm text-muted truncate">{r.accountName}</span>
                  </div>

                  <div className="flex-1 min-w-0">
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

function periodFrom(period: "3m" | "6m" | "1y" | "all") {
  if (period === "all") return "2000-01-01";
  const d = new Date();
  if (period === "3m") d.setMonth(d.getMonth() - 3);
  else if (period === "6m") d.setMonth(d.getMonth() - 6);
  else if (period === "1y") d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function RecordsSkeleton({ counts = [4, 3] }: { counts?: number[] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "hsl(240 3% 6%)" }}>
      {counts.map((count, gi) => (
        <div key={gi}>
          <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04]">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-14" />
          </div>
          {[...Array(count)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-t border-white/[0.04] bg-white/[0.03]">
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
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Insights View ─────────────────────────────────────────────────────────────

function CreditUsageBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-success";
  return (
    <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function InsightsView({ accounts }: { accounts: Account[] }) {
  const creditCards = accounts.filter((a) => a.accountType === "CreditCard");
  const currentAccounts = accounts.filter((a) => a.accountType === "CurrentAccount");

  const totalUsed = creditCards.reduce((s, a) => s + Math.abs(Math.min(a.balance.currentBalance, 0)), 0);
  const totalLimit = creditCards.reduce((s, a) => s + (a.balance.creditLimit ?? 0), 0);
  const totalPct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  const currentAccountsTotal = currentAccounts.reduce((s, a) => s + a.balance.currentBalance, 0);

  return (
    <div className="px-6 py-6 space-y-6">
      <h2 className="text-base font-semibold text-foreground">Insights</h2>

      {/* Credit Cards section */}
      {creditCards.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Credit Cards</p>

          {creditCards.map((a) => {
            const used = Math.abs(Math.min(a.balance.currentBalance, 0));
            const limit = a.balance.creditLimit ?? 0;
            const pct = limit > 0 ? (used / limit) * 100 : 0;
            const Icon = getAccountIcon(a.accountType, a.name);
            const pctColor = pct >= 90 ? "text-danger" : pct >= 70 ? "text-warning" : "text-success";

            return (
              <div key={a.id} className="rounded-xl p-4 space-y-3" style={{ background: "hsl(240 3% 6%)" }}>
                <div className="flex items-center gap-2.5">
                  <Icon weight="fill" className="size-4 shrink-0" style={{ color: a.color ?? "var(--muted-foreground)" }} />
                  <span className="text-sm font-medium text-foreground">{a.name}</span>
                </div>
                <CreditUsageBar pct={pct} />
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="text-muted">Used</p>
                    <p className="font-semibold text-foreground tabular-nums">{fmt(used, a.balance.currencyCode)}</p>
                  </div>
                  <div className="space-y-0.5 text-center">
                    <p className="text-muted">Usage</p>
                    <p className={`font-semibold tabular-nums ${pctColor}`}>{pct.toFixed(1)}%</p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <p className="text-muted">Limit</p>
                    <p className="font-semibold text-foreground tabular-nums">{limit > 0 ? fmt(limit, a.balance.currencyCode) : "—"}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {creditCards.length > 1 && (
            <div className="rounded-xl p-4 space-y-3 border border-white/[0.06]" style={{ background: "hsl(240 3% 8%)" }}>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest">Total</p>
              <CreditUsageBar pct={totalPct} />
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <p className="text-muted">Used</p>
                  <p className="font-semibold text-foreground tabular-nums">{fmt(totalUsed, creditCards[0].balance.currencyCode)}</p>
                </div>
                <div className="space-y-0.5 text-center">
                  <p className="text-muted">Usage</p>
                  <p className={`font-semibold tabular-nums ${totalPct >= 90 ? "text-danger" : totalPct >= 70 ? "text-warning" : "text-success"}`}>
                    {totalPct.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-muted">Limit</p>
                  <p className="font-semibold text-foreground tabular-nums">{totalLimit > 0 ? fmt(totalLimit, creditCards[0].balance.currencyCode) : "—"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Accounts section */}
      {currentAccounts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Current Accounts</p>

          {currentAccounts.map((a) => {
            const Icon = getAccountIcon(a.accountType, a.name);
            const bal = a.balance.currentBalance;
            return (
              <div key={a.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: "hsl(240 3% 6%)" }}>
                <div className="flex items-center gap-2.5">
                  <Icon weight="fill" className="size-4 shrink-0" style={{ color: a.color ?? "var(--muted-foreground)" }} />
                  <span className="text-sm font-medium text-foreground">{a.name}</span>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${bal < 0 ? "text-danger" : "text-foreground"}`}>
                  {fmt(bal, a.balance.currencyCode)}
                </span>
              </div>
            );
          })}

          {currentAccounts.length > 1 && (
            <div className="rounded-xl p-4 flex items-center justify-between border border-white/[0.06]" style={{ background: "hsl(240 3% 8%)" }}>
              <span className="text-xs font-semibold text-muted uppercase tracking-widest">Total</span>
              <span className={`text-sm font-semibold tabular-nums ${currentAccountsTotal < 0 ? "text-danger" : "text-foreground"}`}>
                {fmt(currentAccountsTotal, currentAccounts[0].balance.currencyCode)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [activeView, setActiveView] = useState<"accounts" | "insights">("accounts");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [period, setPeriod] = useState<"3m" | "6m" | "1y" | "all">("3m");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | undefined>();
  const [editingRecord, setEditingRecord] = useState<WalletRecord | null>(null);
  const [duplicatingRecord, setDuplicatingRecord] = useState<WalletRecord | null>(null);
  const recordsSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = localStorage.getItem("wallet_token") ?? "";
    if (t) setToken(t);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Queries ─────────────────────────────────────────────────────────────────

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

  const accountId = selectedAccount === "all" ? undefined : selectedAccount;

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

  // ── Invalidation helper ──────────────────────────────────────────────────────

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["records", token] });
    queryClient.invalidateQueries({ queryKey: ["allRecords", token] });
    queryClient.invalidateQueries({ queryKey: ["accounts", token] });
    queryClient.invalidateQueries({ queryKey: ["stats", token] });
  }

  // ── Auth handlers ────────────────────────────────────────────────────────────

  function handleSave(t: string) {
    localStorage.setItem("wallet_token", t);
    setToken(t);
  }

  function handleDisconnect() {
    localStorage.removeItem("wallet_token");
    setToken("");
    setSelectedAccount("all");
    queryClient.clear();
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  function handleGoToRecord(id: string) {
    const rec = allRecords.find((r) => r.id === id);
    if (rec && rec.accountId !== selectedAccount) {
      setSelectedAccount(rec.accountId);
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
    selectedAccount === "all"
      ? "All Accounts"
      : activeAccounts.find((a) => a.id === selectedAccount)?.name ?? "Records";

  const initialLoading = !!token && (accountsLoading || recordsInitialLoading) && activeAccounts.length === 0;
  const recordsSwitching = !recordsInitialLoading && recordsFetching && !isFetchingNextPage && !isSearching;

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem" } as React.CSSProperties}>
      {/* Sidebar */}
      {initialLoading ? (
        <Sidebar variant="floating">
          <SidebarHeader className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50">Accounts</p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="pt-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <div className="px-2 py-1.5">
                      <Skeleton className="h-9 w-full rounded-lg" />
                    </div>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup className="pt-0">
              <SidebarGroupLabel>
                <Skeleton className="h-2.5 w-16" />
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[...Array(4)].map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <div className="flex items-center gap-2 px-2 py-2">
                        <Skeleton className="size-4 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-3 w-4 shrink-0" />
                      </div>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      ) : activeAccounts.length > 0 ? (
        <Sidebar variant="floating">
          <SidebarHeader className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50">Accounts</p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="pt-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={selectedAccount === "all" && activeView === "accounts"}
                      onClick={() => { setSelectedAccount("all"); setActiveView("accounts"); }}
                      size="lg"
                    >
                      <span className="font-medium">All Accounts</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="pt-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeView === "insights"}
                      onClick={() => setActiveView(activeView === "insights" ? "accounts" : "insights")}
                      size="lg"
                    >
                      <span className="font-medium">Insights</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            {Array.from(
              activeAccounts.reduce((map, a) => {
                const type = a.accountType || "Other";
                if (!map.has(type)) map.set(type, []);
                map.get(type)!.push(a);
                return map;
              }, new Map<string, typeof activeAccounts>())
            ).sort(([a], [b]) => a.localeCompare(b)).map(([type, accs]) => (
              <SidebarGroup key={type} className="pt-0">
                <SidebarGroupLabel className="text-[10px] uppercase tracking-widest px-2">
                  {type.replace(/([A-Z])/g, " $1").trim()}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {accs.map((a) => {
                      const Icon = getAccountIcon(a.accountType, a.name);
                      const bal = a.balance.currentBalance;
                      const isActive = selectedAccount === a.id && activeView === "accounts";
                      return (
                        <SidebarMenuItem key={a.id}>
                          <div className={`group/row flex items-center gap-1 rounded-lg px-2 py-2 transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"}`}>
                            <button
                              className="flex-1 flex items-center gap-2 min-w-0 text-left"
                              onClick={() => { setSelectedAccount(a.id); setActiveView("accounts"); }}
                            >
                              <Icon weight="fill" className="size-4 shrink-0" style={{ color: a.color ?? "currentColor" }} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{a.name}</p>
                                <p className={`text-xs tabular-nums ${bal < 0 ? "text-danger" : "text-sidebar-foreground/50"}`}>
                                  {fmt(bal, a.balance.currencyCode)}
                                </p>
                              </div>
                            </button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className={`shrink-0 p-1 rounded-md text-sidebar-foreground/30 hover:text-sidebar-foreground/70 transition-colors ${isActive ? "opacity-100" : "opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto"}`}
                                >
                                  <Info className="size-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="right" align="start" className="w-64 p-4 space-y-3 border-border bg-[#1a1a1a]">
                                <div className="flex items-center gap-2.5">
                                  <Icon weight="fill" className="size-5 shrink-0" style={{ color: a.color ?? "currentColor" }} />
                                  <p className="text-sm font-semibold text-foreground">{a.name}</p>
                                </div>
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted">Type</span>
                                    <span className="text-foreground">{a.accountType.replace(/([A-Z])/g, " $1").trim()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted">Balance</span>
                                    <span className={`font-semibold tabular-nums ${bal < 0 ? "text-danger" : "text-foreground"}`}>
                                      {fmt(bal, a.balance.currencyCode)}
                                    </span>
                                  </div>
                                  {a.initialBalance.value !== 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-muted">Initial balance</span>
                                      <span className="text-foreground tabular-nums">{fmt(a.initialBalance.value, a.initialBalance.currencyCode)}</span>
                                    </div>
                                  )}
                                  {a.balance.creditLimit != null && a.balance.creditLimit > 0 && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-muted">Credit limit</span>
                                        <span className="text-foreground tabular-nums">{fmt(a.balance.creditLimit, a.balance.currencyCode)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted">Usage</span>
                                        {(() => {
                                          const used = Math.abs(Math.min(bal, 0));
                                          const pct = (used / a.balance.creditLimit!) * 100;
                                          return (
                                            <span className={`font-semibold tabular-nums ${pct >= 90 ? "text-danger" : pct >= 70 ? "text-warning" : "text-success"}`}>
                                              {pct.toFixed(1)}%
                                            </span>
                                          );
                                        })()}
                                      </div>
                                      {a.balance.availableCredit != null && (
                                        <div className="flex justify-between">
                                          <span className="text-muted">Available credit</span>
                                          <span className="text-success tabular-nums">{fmt(a.balance.availableCredit, a.balance.currencyCode)}</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {a.recordStats && (
                                    <div className="flex justify-between">
                                      <span className="text-muted">Transactions</span>
                                      <span className="text-foreground">{a.recordStats.recordCount.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>
      ) : null}

      {/* Main area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main ref={recordsSectionRef} className="flex-1 overflow-y-auto">

          {!token && <TokenConnectForm onSave={handleSave} />}

          {activeView === "insights" && !initialLoading ? (
            <InsightsView accounts={activeAccounts} />
          ) : token && initialLoading ? (
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
          ) : (activeAccounts.length > 0 || records.length > 0) ? (
            <div className="px-6 py-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{selectedAccountName}</h2>
                  {isSearching && (
                    <p className="text-xs text-muted mt-0.5">
                      {searchFetching ? "Searching…" : `${displayedRecords.length} result${displayedRecords.length !== 1 ? "s" : ""} for "${debouncedSearch}"`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!isSearching && (
                    <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5">
                      {(["3m", "6m", "1y", "all"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPeriod(p)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            period === p ? "bg-white/[0.12] text-foreground" : "text-muted hover:text-foreground"
                          }`}
                        >
                          {p === "3m" ? "3M" : p === "6m" ? "6M" : p === "1y" ? "1Y" : "All"}
                        </button>
                      ))}
                    </div>
                  )}
                  {token && (
                    <AddRecordButton
                      token={token}
                      accounts={activeAccounts}
                      records={allRecords}
                      defaultAccountId={selectedAccount === "all" ? undefined : selectedAccount}
                      onSuccess={invalidateAll}
                      onGoToRecord={handleGoToRecord}
                      onOpenRecord={setEditingRecord}
                    />
                  )}
                  <SettingsPopover
                    token={token}
                    stats={stats}
                    onSave={handleSave}
                    onDisconnect={handleDisconnect}
                  />
                </div>
              </div>

              {/* Search bar */}
              <div className="relative flex items-center">
                <Search className="absolute left-3 size-3.5 text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by note or payee…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-white/[0.05] text-foreground placeholder:text-muted focus:outline-none focus:bg-white/[0.09] transition-colors"
                />
                {searchInput && (
                  <button onClick={() => { setSearchInput(""); setDebouncedSearch(""); }} className="absolute right-3 text-muted hover:text-foreground">
                    <X className="size-3.5" />
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
                    className="px-4 py-2 rounded-lg text-xs font-medium text-muted hover:text-foreground hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isFetchingNextPage ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>

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
    </SidebarProvider>
  );
}
