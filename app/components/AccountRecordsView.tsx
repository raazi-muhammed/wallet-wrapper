"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { keepPreviousData, useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  ArrowLeft01Icon,
  Tick02Icon,
  PencilEdit02Icon,
  CheckListIcon,
} from "@hugeicons/core-free-icons";
import { patchRecords } from "../actions";
import { fetchRecords } from "@/lib/wallet-fetch";
import { accountsQuery, recordsQuery, type Period } from "@/hooks/use-wallet-data";
import { useIdlePreload } from "@/hooks/use-idle-preload";
import type { Account, WalletRecord } from "../actions";
import { ICON_BG_COLORS, getCategoryIcon, getAccountIcon, hashStr } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { RECORD_STATES } from "@/lib/records";
import { ErrorBox, LabelChip, unwrap } from "./EditControls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TokenConnectForm } from "./TokenConnectForm";
import { useDashboard, useDashboardSearch } from "./DashboardProvider";

// Modals and the bulk action bar only appear after a click, so their code
// (forms, date picker, calendar) loads separately; useIdlePreload below
// fetches it in the background once the page has settled.
const AddRecordModal = dynamic(() => import("./AddRecordModal").then((m) => m.AddRecordModal));
const RecordDetailModal = dynamic(() => import("./AddRecordModal").then((m) => m.RecordDetailModal));
const EditRecordModal = dynamic(() => import("./AddRecordModal").then((m) => m.EditRecordModal));
const DuplicateRecordModal = dynamic(() => import("./AddRecordModal").then((m) => m.DuplicateRecordModal));
const AccountEditModal = dynamic(() => import("./AccountEditModal").then((m) => m.AccountEditModal));
const BulkActionBar = dynamic(() => import("./RecordBulkActions").then((m) => m.BulkActionBar));

function preloadRecordModals() {
  void import("./AddRecordModal");
  void import("./AccountEditModal");
  void import("./RecordBulkActions");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const longDateFormat = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" });

const PERIOD_LABELS: Record<Period, string> = {
  "3m": "3 months",
  "6m": "6 months",
  "1y": "1 year",
  all: "all time",
};

/** Shorter queries match too much to be useful and would cost a request per keystroke pause. */
const MIN_SEARCH_LENGTH = 2;

// ── Records Table ─────────────────────────────────────────────────────────────

type RecordsPage = { records: WalletRecord[]; nextOffset: number | null };

/** Applies `patch` to a record wherever it's cached: account lists and search results. */
function updateCachedRecord(queryClient: ReturnType<typeof useQueryClient>, session: string, id: string, patch: Partial<WalletRecord>) {
  const update = (r: WalletRecord) => (r.id === id ? { ...r, ...patch } : r);
  queryClient.setQueriesData<InfiniteData<RecordsPage>>({ queryKey: ["records", session] }, (data) =>
    data && { ...data, pages: data.pages.map((p) => ({ ...p, records: p.records.map(update) })) }
  );
  queryClient.setQueriesData<WalletRecord[]>({ queryKey: ["search", session] }, (data) => data?.map(update));
}

// The badge on a record's icon doubles as a quick status picker.
function StatusBadge({ record }: { record: WalletRecord }) {
  const { session, invalidateRecords } = useDashboard();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { mutate: setState, isPending, error } = useMutation({
    mutationFn: async (state: (typeof RECORD_STATES)[number]["id"]) =>
      unwrap(await patchRecords([{ id: record.id, recordState: state }])),
    // Show the new status straight away; the refetch afterwards corrects it if the patch failed.
    onMutate: (state) => updateCachedRecord(queryClient, session, record.id, { recordState: state }),
    onSuccess: () => setOpen(false),
    onSettled: invalidateRecords,
  });

  const state = record.recordState;
  // Paired transfers share their status with the mirror record, so the API locks it.
  const locked = !!record.transfer?.paired;
  const badgeClass =
    state === "reconciled" ? "bg-accent" :
    state === "cleared" ? "bg-success" :
    "bg-card border border-muted/60";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          disabled={locked}
          title={locked ? "Status of paired transfers can't be changed" : `Status: ${state ?? "unknown"}`}
          aria-label="Change status"
          className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full flex items-center justify-center ${badgeClass} ${locked ? "" : "hover:scale-125 transition-transform"}`}
        >
          {(state === "cleared" || state === "reconciled") && (
            <svg viewBox="0 0 10 10" className="size-2 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1 bg-card border-0" align="start" onClick={(e) => e.stopPropagation()}>
        {RECORD_STATES.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={isPending}
            onClick={() => s.id !== state && setState(s.id)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md text-left hover:bg-default transition-colors ${s.id === state ? "font-semibold text-accent" : "text-foreground"}`}
          >
            {s.label}
            {s.id === state && <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />}
          </button>
        ))}
        {error && <p className="px-3 py-1.5 text-xs text-danger">{error.message}</p>}
      </PopoverContent>
    </Popover>
  );
}

// The table is one flat list of day headers and record rows, so it can be virtualized.
type ListItem =
  | { kind: "day"; date: string; total: number; currency: string | undefined; firstDay: boolean }
  | { kind: "record"; record: WalletRecord; isFirst: boolean; isLast: boolean; striped: boolean };

function toListItems(records: WalletRecord[]): ListItem[] {
  const days = new Map<string, WalletRecord[]>();
  for (const r of records) {
    const key = r.recordDate.slice(0, 10);
    const day = days.get(key);
    if (day) day.push(r);
    else days.set(key, [r]);
  }
  const items: ListItem[] = [];
  let rowIndex = 0;
  for (const [date, dayRecords] of days) {
    items.push({
      kind: "day",
      date,
      total: dayRecords.reduce((sum, r) => sum + r.amount.value, 0),
      currency: dayRecords[0]?.amount.currencyCode,
      firstDay: items.length === 0,
    });
    dayRecords.forEach((record, i) => {
      items.push({ kind: "record", record, isFirst: i === 0, isLast: i === dayRecords.length - 1, striped: rowIndex++ % 2 === 1 });
    });
  }
  return items;
}

/** The nearest ancestor that scrolls: the resizable panel the view sits in (see DashboardShell). */
function findScrollParent(el: HTMLElement | null) {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}

/** Where `list` starts inside `scrollEl`'s content, tracked as the content above it resizes. */
function useOffsetInScrollParent(list: HTMLElement | null, scrollEl: HTMLElement | null) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!list || !scrollEl) return;
    const measure = () =>
      setOffset(list.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop);
    // Fires once on observe, then whenever the content (search summary, header wrap) changes height.
    const observer = new ResizeObserver(measure);
    for (const child of scrollEl.children) observer.observe(child);
    return () => observer.disconnect();
  }, [list, scrollEl]);
  return offset;
}

const RecordRow = memo(function RecordRow({ item, account, selecting, isSelected, onEdit, onToggleSelect }: {
  item: Extract<ListItem, { kind: "record" }>;
  account: Account | undefined;
  selecting: boolean;
  isSelected: boolean;
  onEdit?: (r: WalletRecord) => void;
  onToggleSelect?: (r: WalletRecord) => void;
}) {
  const { record: r, isFirst, isLast, striped } = item;
  const { value, currencyCode } = r.amount;
  const positive = value > 0;
  const categoryIcon = getCategoryIcon(r.category?.name ?? "", r.category?.group?.name);
  const iconColor = ICON_BG_COLORS[hashStr(r.category?.name ?? r.accountName) % ICON_BG_COLORS.length];
  const accountIcon = getAccountIcon(account?.accountType ?? "", r.accountName);
  const accountColor = account?.color ?? "var(--muted-foreground)";

  return (
    <div
      data-record-id={r.id}
      onClick={() => (selecting ? onToggleSelect?.(r) : onEdit?.(r))}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${isSelected ? "bg-accent/10" : striped ? "bg-card-2" : "bg-card"} ${isFirst ? "rounded-t-xl" : ""} ${isLast ? "rounded-b-xl" : ""}`}
    >
      {selecting && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect?.(r)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select record"
          className="size-4 shrink-0 accent-primary"
        />
      )}
      <div className="relative shrink-0">
        <div className={`size-9 rounded-full flex items-center justify-center ${iconColor}`}>
          <HugeiconsIcon icon={categoryIcon} className="size-4" />
        </div>
        {!selecting && <StatusBadge record={r} />}
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

      <div className="hidden md:flex flex-1 min-w-0 items-center gap-2">
        <span className="text-sm text-muted truncate">{r.note ?? ""}</span>
        {r.labels.slice(0, 2).map((l) => <LabelChip key={l.id} label={l} />)}
        {r.labels.length > 2 && <span className="text-xs text-muted shrink-0">+{r.labels.length - 2}</span>}
      </div>

      <div className="shrink-0 text-right">
        <p className={`text-sm font-semibold tabular-nums ${positive ? "text-success" : "text-danger"}`}>
          {positive ? "+" : ""}{formatMoney(value, currencyCode)}
        </p>
        <p className="text-xs text-muted">{timeFormat.format(new Date(r.recordDate))}</p>
      </div>
    </div>
  );
});

function DayHeader({ item }: { item: Extract<ListItem, { kind: "day" }> }) {
  return (
    // The top padding stands in for the gap between days.
    <div className={item.firstDay ? "" : "pt-3"}>
      <div className="flex items-center justify-between px-4 py-2 bg-background">
        <span className="text-xs font-semibold text-muted">{longDateFormat.format(new Date(item.date + "T00:00:00"))}</span>
        <span className="text-xs font-mono font-semibold text-muted">
          {item.total >= 0 ? "+" : ""}{formatMoney(item.total, item.currency)}
        </span>
      </div>
    </div>
  );
}

// Memoized: the records view re-renders on every search keystroke. Only the
// rows in (and just beyond) the viewport are rendered, so long periods and
// "Load more" don't grow the DOM without bound.
const RecordsTable = memo(function RecordsTable({ records, accounts, onEdit, selectedIds, onToggleSelect }: {
  records: WalletRecord[];
  accounts: Account[];
  onEdit?: (r: WalletRecord) => void;
  /** Set while selecting records for a bulk action; rows then toggle selection instead of opening. */
  selectedIds?: Set<string>;
  onToggleSelect?: (r: WalletRecord) => void;
}) {
  const [list, setList] = useState<HTMLDivElement | null>(null);
  const scrollEl = useMemo(() => findScrollParent(list), [list]);
  const scrollMargin = useOffsetInScrollParent(list, scrollEl);
  const items = useMemo(() => toListItems(records), [records]);
  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollEl,
    estimateSize: (i) => (items[i].kind === "day" ? (i === 0 ? 32 : 44) : 64),
    getItemKey: (i) => {
      const item = items[i];
      return item.kind === "day" ? `day-${item.date}` : item.record.id;
    },
    overscan: 8,
    scrollMargin,
  });

  if (records.length === 0) {
    return <p className="text-center py-12 text-muted text-sm">No records found.</p>;
  }

  const selecting = !!selectedIds;
  return (
    <div ref={setList} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((v) => {
        const item = items[v.index];
        return (
          <div
            key={v.key}
            data-index={v.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${v.start - scrollMargin}px)` }}
          >
            {item.kind === "day" ? (
              <DayHeader item={item} />
            ) : (
              <RecordRow
                item={item}
                account={accountsById.get(item.record.accountId)}
                selecting={selecting}
                isSelected={selectedIds?.has(item.record.id) ?? false}
                onEdit={onEdit}
                onToggleSelect={onToggleSelect}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

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

// Stable fallbacks, so memoized derivations don't recompute on every render while data loads.
const NO_ACCOUNTS: Account[] = [];
const NO_RECORDS: WalletRecord[] = [];

/** Newest first. Each date is parsed once rather than on every comparison. */
function sortByDateDesc(records: WalletRecord[]) {
  return records
    .map((r) => ({ r, t: Date.parse(r.recordDate) }))
    .sort((a, b) => b.t - a.t)
    .map(({ r }) => r);
}

export function AccountRecordsView({ accountId }: { accountId?: string }) {
  const router = useRouter();
  const { session, tokenReady, period, handleSave, invalidateRecords } = useDashboard();
  const { searchInput, setSearchInput, debouncedSearch } = useDashboardSearch();
  // `viewingRecord` drives the read-only detail modal; `editingRecord` the edit form opened from it.
  const [viewingRecord, setViewingRecord] = useState<WalletRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<WalletRecord | null>(null);
  const [duplicatingRecord, setDuplicatingRecord] = useState<WalletRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);

  useIdlePreload(preloadRecordModals);

  const toggleSelected = useCallback((r: WalletRecord) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
      return next;
    });
  }, []);

  const { data: accounts = NO_ACCOUNTS, isLoading: accountsLoading, error: accountsError } = useQuery(accountsQuery(session));

  const {
    data: recordsData,
    isLoading: recordsInitialLoading,
    error: recordsError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery(recordsQuery(session, accountId, period));

  const searchQuery = debouncedSearch.trim();
  const isSearching = searchQuery.length >= MIN_SEARCH_LENGTH;

  const { data: searchResults = NO_RECORDS, isLoading: searchInitialLoading, isFetching: searchFetching } = useQuery({
    queryKey: queryKeys.search(session, searchQuery),
    queryFn: async () => {
      // The API filters one field at a time, so notes and payees are searched separately and merged.
      const [noteRes, cpRes] = await Promise.all([
        fetchRecords({ from: "2000-01-01", limit: 200, note: searchQuery }),
        fetchRecords({ from: "2000-01-01", limit: 200, counterParty: searchQuery }),
      ]);
      const seen = new Set<string>();
      const merged: WalletRecord[] = [];
      for (const r of [...noteRes.records, ...cpRes.records]) {
        if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
      }
      return merged;
    },
    enabled: !!session && isSearching,
    staleTime: 30_000,
    // Keep the previous query's results on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

  // ── Derived state ────────────────────────────────────────────────────────────

  const records = useMemo(() => recordsData?.pages.flatMap((p) => p.records) ?? NO_RECORDS, [recordsData]);
  const displayedRecords = useMemo(
    () => sortByDateDesc(isSearching ? searchResults : records),
    [isSearching, searchResults, records]
  );
  const activeAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts]);
  const currentAccount = accountId === undefined ? undefined : accounts.find((a) => a.id === accountId);
  const selectedAccountName =
    accountId === undefined
      ? "All Accounts"
      : currentAccount?.name ?? "Records";
  const selectedRecords = selectedIds ? displayedRecords.filter((r) => selectedIds.has(r.id)) : [];

  const initialLoading = !tokenReady || (!!session && (accountsLoading || recordsInitialLoading) && activeAccounts.length === 0);
  // Only while there's nothing to show for the current account or query —
  // background refetches (after an edit, on window focus) keep the list up.
  const showRecordsSkeleton = isSearching ? searchInitialLoading : recordsInitialLoading;

  if (tokenReady && !session) {
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
    // A failed load would otherwise leave the page blank.
    const error = accountsError ?? recordsError;
    return error ? (
      <div className="px-6 py-6">
        <ErrorBox error={error} />
      </div>
    ) : null;
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
            {currentAccount && (
              <button
                onClick={() => setEditingAccount(true)}
                aria-label="Edit account"
                title="Edit account"
                className="flex items-center justify-center size-6 rounded-full text-muted hover:text-foreground hover:bg-default transition-colors shrink-0"
              >
                <HugeiconsIcon icon={PencilEdit02Icon} className="size-3.5" />
              </button>
            )}
          </h2>
          {isSearching && (
            <p className="text-xs text-muted mt-0.5">
              {searchFetching ? "Searching…" : `${displayedRecords.length} result${displayedRecords.length !== 1 ? "s" : ""} for "${searchQuery}"`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant={selectedIds ? "secondary" : "ghost"}
            onClick={() => setSelectedIds(selectedIds ? null : new Set())}
            aria-pressed={!!selectedIds}
          >
            <HugeiconsIcon icon={CheckListIcon} className="size-4" />
            Select
          </Button>
          <Button onClick={() => setAdding(true)} disabled={!session}>
            + Add Record
          </Button>
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

      {showRecordsSkeleton ? (
        <RecordsSkeleton />
      ) : (
        <RecordsTable
          records={displayedRecords}
          accounts={accounts}
          onEdit={setViewingRecord}
          selectedIds={selectedIds ?? undefined}
          onToggleSelect={toggleSelected}
        />
      )}

      {selectedIds && (
        <BulkActionBar
          session={session}
          selected={selectedRecords}
          accounts={accounts}
          onSelectAll={() => setSelectedIds(new Set(displayedRecords.map((r) => r.id)))}
          onClear={() => setSelectedIds(null)}
          onDone={() => { setSelectedIds(new Set()); invalidateRecords(); }}
        />
      )}

      {!showRecordsSkeleton && !isSearching && hasNextPage && (
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

      {!showRecordsSkeleton && !isSearching && period !== "all" && (
        <p className="text-center text-xs text-muted pt-1 pb-2">
          Only showing data for the last {PERIOD_LABELS[period]}. Open Settings to change the range.
        </p>
      )}

      {adding && (
        <AddRecordModal
          session={session}
          accounts={activeAccounts}
          defaultAccountId={accountId}
          isOpen={adding}
          onClose={() => setAdding(false)}
          onSuccess={invalidateRecords}
          onOpenRecord={(rec) => { setAdding(false); setViewingRecord(rec); }}
        />
      )}
      {viewingRecord && (
        <RecordDetailModal
          record={viewingRecord}
          accounts={activeAccounts}
          isOpen={!!viewingRecord}
          onClose={() => setViewingRecord(null)}
          onDuplicate={() => { setDuplicatingRecord(viewingRecord); setViewingRecord(null); }}
          onEdit={() => { setEditingRecord(viewingRecord); setViewingRecord(null); }}
          onDeleted={invalidateRecords}
        />
      )}
      {editingRecord && (
        <EditRecordModal
          record={editingRecord}
          session={session}
          accounts={accounts.filter((a) => !a.archived || a.id === editingRecord.accountId)}
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={invalidateRecords}
          onOpenRecord={setViewingRecord}
        />
      )}
      {currentAccount && editingAccount && (
        <AccountEditModal
          account={currentAccount}
          isOpen={editingAccount}
          onClose={() => setEditingAccount(false)}
        />
      )}
      {duplicatingRecord && (
        <DuplicateRecordModal
          record={duplicatingRecord}
          session={session}
          accounts={activeAccounts}
          isOpen={!!duplicatingRecord}
          onClose={() => setDuplicatingRecord(null)}
          onSuccess={() => { setDuplicatingRecord(null); invalidateRecords(); }}
          onOpenRecord={(rec) => { setDuplicatingRecord(null); setViewingRecord(rec); }}
        />
      )}
    </div>
  );
}
