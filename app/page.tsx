"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Wallet,
  Banknote,
  Landmark,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Shield,
  CircleDashed,
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
import { AddRecordButton, EditRecordModal } from "./components/AddRecordModal";
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

// ── Account type icons ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TYPE_ICONS: Record<string, ComponentType<any>> = {
  General: Wallet,
  Cash: Banknote,
  CurrentAccount: Landmark,
  SavingAccount: PiggyBank,
  CreditCard: CreditCard,
  Investment: TrendingUp,
  Insurance: Shield,
};

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
        className="flex items-center justify-center size-8 rounded-full bg-default hover:bg-default-hover text-muted transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4Z"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-14 right-4 z-50 w-80 rounded-xl border border-border bg-background shadow-lg space-y-4 p-4">
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

// ── Sidebar Account Item ──────────────────────────────────────────────────────


// ── Records Table ─────────────────────────────────────────────────────────────

function RecordsTable({ records, highlightedId, onEdit }: { records: WalletRecord[]; highlightedId?: string; onEdit?: (r: WalletRecord) => void }) {
  if (records.length === 0) {
    return <p className="text-center py-12 text-muted text-sm">No records found.</p>;
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.08 0.02 268)" }}>
      <Table>
        <TableHeader className="[&_tr]:border-0">
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className="text-muted font-medium">Date</TableHead>
            <TableHead className="text-muted font-medium">Account</TableHead>
            <TableHead className="text-muted font-medium">Category</TableHead>
            <TableHead className="text-muted font-medium">Note</TableHead>
            <TableHead className="text-muted font-medium">Payee</TableHead>
            <TableHead className="text-muted font-medium">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => {
            const { value, currencyCode } = r.amount;
            const positive = value > 0;
            const highlighted = r.id === highlightedId;
            return (
              <TableRow
                key={r.id}
                data-record-id={r.id}
                onClick={() => onEdit?.(r)}
                className={`border-0 cursor-pointer odd:bg-white/[0.03] even:bg-transparent hover:bg-white/[0.07] ${highlighted ? "outline outline-2 outline-accent" : ""}`}
              >
                <TableCell className="text-foreground">{fmtDate(r.recordDate)}</TableCell>
                <TableCell className="text-foreground">{r.accountName}</TableCell>
                <TableCell>
                  {r.category
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-default text-muted whitespace-nowrap">{r.category.name}</span>
                    : <span className="text-muted">—</span>}
                </TableCell>
                <TableCell>
                  {r.note
                    ? <span className="block max-w-[160px] truncate text-foreground">{r.note}</span>
                    : <span className="text-muted">—</span>}
                </TableCell>
                <TableCell>
                  {r.counterParty
                    ? <span className="block max-w-[120px] truncate text-foreground">{r.counterParty}</span>
                    : <span className="text-muted">—</span>}
                </TableCell>
                <TableCell>
                  <span className={`font-mono font-semibold tabular-nums whitespace-nowrap ${positive ? "text-success" : "text-danger"}`}>
                    {positive ? "+" : ""}{fmt(value, currencyCode)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [token, setToken] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [records, setRecords] = useState<WalletRecord[]>([]);
  const [allRecords, setAllRecords] = useState<WalletRecord[]>([]);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [highlightedId, setHighlightedId] = useState<string | undefined>();
  const [editingRecord, setEditingRecord] = useState<WalletRecord | null>(null);
  const recordsSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = localStorage.getItem("wallet_token") ?? "";
    if (t) { setToken(t); loadData(t); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async (t: string) => {
    if (!t) return;
    setLoading(true);
    setError("");
    try {
      const [accts, recs, apiStats] = await Promise.all([
        fetchAccounts(t),
        fetchRecords(t),
        fetchApiStats(t),
      ]);
      setAccounts(accts);
      setRecords(recs);
      setAllRecords(recs);
      setSelectedAccount("all");
      setStats(apiStats);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAccountSelect = useCallback(async (accountId: string) => {
    setSelectedAccount(accountId);
    if (accountId === "all") {
      setRecords(allRecords);
      return;
    }
    setRecordsLoading(true);
    try {
      const recs = await fetchRecords(token, accountId);
      setRecords(recs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch records");
    } finally {
      setRecordsLoading(false);
    }
  }, [token, allRecords]);

  function handleSave(t: string) {
    localStorage.setItem("wallet_token", t);
    setToken(t);
    loadData(t);
  }

  function handleDisconnect() {
    localStorage.removeItem("wallet_token");
    setToken("");
    setAccounts([]);
    setRecords([]);
    setStats(null);
    setError("");
  }

  async function handleGoToRecord(id: string) {
    const rec = allRecords.find((r) => r.id === id);
    if (rec && rec.accountId !== selectedAccount) {
      await handleAccountSelect(rec.accountId);
    }
    setHighlightedId(id);
    setTimeout(() => {
      const el = document.querySelector(`[data-record-id="${id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    setTimeout(() => setHighlightedId(undefined), 2500);
  }

  const sorted = (list: WalletRecord[]) =>
    [...list].sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());

  const displayedRecords = sorted(records);
  const activeAccounts = accounts.filter((a) => !a.archived);

  const selectedAccountName =
    selectedAccount === "all"
      ? "All Accounts"
      : activeAccounts.find((a) => a.id === selectedAccount)?.name ?? "Records";

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem" } as React.CSSProperties}>
      {/* Sidebar */}
      {activeAccounts.length > 0 && (
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
                      isActive={selectedAccount === "all"}
                      onClick={() => handleAccountSelect("all")}
                      size="lg"
                      className="justify-between"
                    >
                      <span className="font-medium">All Accounts</span>
                      <span className="text-xs text-sidebar-foreground/50">{allRecords.length}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {activeAccounts.map((a) => {
                    const count = allRecords.filter((r) => r.accountId === a.id).length;
                    const Icon = TYPE_ICONS[a.accountType] ?? CircleDashed;
                    const bal = a.balance.currentBalance;
                    return (
                      <SidebarMenuItem key={a.id}>
                        <SidebarMenuButton
                          isActive={selectedAccount === a.id}
                          onClick={() => handleAccountSelect(a.id)}
                          size="lg"
                          className="justify-between h-auto py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="size-4 shrink-0 text-sidebar-foreground/60" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{a.name}</p>
                              <p className={`text-xs tabular-nums ${bal < 0 ? "text-danger" : "text-sidebar-foreground/50"}`}>
                                {fmt(bal, a.balance.currencyCode)}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-sidebar-foreground/40 shrink-0">{count}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navbar */}
        <header className="shrink-0 z-10 border-b border-border bg-white/5 backdrop-blur">
          <div className="relative w-full px-4 h-14 flex items-center">
            <h1 className="text-base font-semibold text-foreground">Wallet Dashboard</h1>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-end gap-3">
              {loading && <span className="text-xs text-muted animate-pulse">Loading…</span>}
              {token && (
                <AddRecordButton
                  token={token}
                  accounts={activeAccounts}
                  records={records}
                  onSuccess={() => loadData(token)}
                  onGoToRecord={handleGoToRecord}
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
        </header>

        {/* Main content */}
        <main ref={recordsSectionRef} className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-6 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
              {error}
            </div>
          )}

          {!token && <TokenConnectForm onSave={handleSave} />}

          {(activeAccounts.length > 0 || records.length > 0) && (
            <div className="px-6 py-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{selectedAccountName}</h2>
                <p className="text-xs text-muted mt-0.5">
                  {recordsLoading
                    ? "Loading…"
                    : `${displayedRecords.length} record${displayedRecords.length !== 1 ? "s" : ""} · last 3 months`}
                </p>
              </div>
              <RecordsTable records={displayedRecords} highlightedId={highlightedId} onEdit={setEditingRecord} />
            </div>
          )}
        </main>
      </div>

      {editingRecord && (
        <EditRecordModal
          token={token}
          accounts={activeAccounts}
          records={records}
          record={editingRecord}
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={() => { setEditingRecord(null); loadData(token); }}
          onGoToRecord={handleGoToRecord}
        />
      )}
    </SidebarProvider>
  );
}
