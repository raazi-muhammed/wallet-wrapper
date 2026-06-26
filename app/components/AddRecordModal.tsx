"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchCategories, fetchRecords } from "../actions";
import type { Account, Category, WalletRecord } from "../actions";
import { getCategoryIcon, getAccountIcon } from "@/lib/utils";

type RecordType = "expense" | "income" | "transfer";


const PAYMENT_TYPES: { id: string; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "debit_card", label: "Debit Card" },
  { id: "credit_card", label: "Credit Card" },
  { id: "transfer", label: "Transfer" },
  { id: "voucher", label: "Voucher" },
  { id: "mobile_payment", label: "Mobile Payment" },
  { id: "web_payment", label: "Web Payment" },
];
const RECORD_STATES: { id: string; label: string }[] = [
  { id: "cleared", label: "Cleared" },
  { id: "uncleared", label: "Uncleared" },
  { id: "reconciled", label: "Reconciled" },
];

function fmt(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function toDatetimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

// ── Add Record Button ─────────────────────────────────────────────────────────

interface AddProps {
  token: string;
  accounts: Account[];
  records: WalletRecord[];
  defaultAccountId?: string;
  onSuccess: () => void;
  onGoToRecord: (id: string) => void;
}

export function AddRecordButton({ token, accounts, records, defaultAccountId, onSuccess, onGoToRecord }: AddProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!token}>
        + Add Record
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[720px] w-full p-0 overflow-y-auto max-h-[90vh]">
          <RecordForm
            mode="add"
            token={token}
            accounts={accounts}
            records={records}
            defaultAccountId={defaultAccountId}
            onSuccess={() => { setOpen(false); onSuccess(); }}
            onCancel={() => setOpen(false)}
            onGoToRecord={(id) => { setOpen(false); onGoToRecord(id); }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Record Detail Modal ───────────────────────────────────────────────────────

export function RecordDetailModal({ record, accounts, isOpen, onClose, onDuplicate }: {
  record: WalletRecord;
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
  onDuplicate?: () => void;
}) {
  const account = accounts.find((a) => a.id === record.accountId);
  const AccountIcon = getAccountIcon(account?.accountType ?? "", record.accountName);
  const accountColor = account?.color ?? "var(--muted-foreground)";
  const CategoryIcon = getCategoryIcon(record.category?.name ?? "", record.category?.group?.name);

  const positive = record.amount.value > 0;
  const recordType = record.recordType?.toLowerCase();
  const typeLabel = recordType === "income" ? "Income" : recordType === "transfer" ? "Transfer" : "Expense";

  const paymentLabel = PAYMENT_TYPES.find((p) => p.id === record.paymentType)?.label ?? record.paymentType;
  const stateLabel = RECORD_STATES.find((s) => s.id === record.recordState)?.label ?? record.recordState ?? "—";

  const date = record.recordDate ? new Date(record.recordDate) : null;
  const dateStr = date
    ? date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const timeStr = date
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm w-full p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">Record Details</DialogTitle>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              typeLabel === "Income" ? "bg-success/15 text-success" :
              typeLabel === "Transfer" ? "bg-blue-500/15 text-blue-400" :
              "bg-danger/15 text-danger"
            }`}>{typeLabel}</span>
          </div>
          <p className={`text-3xl font-bold tabular-nums mt-3 ${positive ? "text-success" : "text-danger"}`}>
            {positive ? "+" : ""}{fmt(record.amount.value, record.amount.currencyCode)}
          </p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-3.5">
          <DetailRow label="Category">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                <CategoryIcon className="size-3" />
              </div>
              <span className="text-sm">{record.category?.name ?? "—"}</span>
              {record.category?.group && (
                <span className="text-xs text-muted">· {record.category.group.name}</span>
              )}
            </div>
          </DetailRow>

          <DetailRow label="Account">
            <div className="flex items-center gap-2">
              <AccountIcon weight="fill" className="size-4 shrink-0" style={{ color: accountColor }} />
              <span className="text-sm">{record.accountName}</span>
            </div>
          </DetailRow>

          <DetailRow label="Date">
            <span className="text-sm">{dateStr}{timeStr ? ` · ${timeStr}` : ""}</span>
          </DetailRow>

          <DetailRow label="Payment">
            <span className="text-sm">{paymentLabel}</span>
          </DetailRow>

          <DetailRow label="Status">
            <span className="text-sm">{stateLabel}</span>
          </DetailRow>

          {record.counterParty && (
            <DetailRow label="Payer">
              <span className="text-sm">{record.counterParty}</span>
            </DetailRow>
          )}

          {record.note && (
            <DetailRow label="Note">
              <span className="text-sm text-muted">{record.note}</span>
            </DetailRow>
          )}
        </div>

        {onDuplicate && (
          <div className="px-6 pb-5">
            <button
              onClick={() => { onClose(); onDuplicate(); }}
              className="w-full py-2 rounded-xl border border-border text-sm font-medium text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              Duplicate record
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DuplicateRecordModal({ record, token, accounts, records, isOpen, onClose, onSuccess, onGoToRecord }: {
  record: WalletRecord;
  token: string;
  accounts: Account[];
  records: WalletRecord[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onGoToRecord: (id: string) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[720px] w-full p-0 overflow-y-auto max-h-[90vh]">
        <RecordForm
          mode="add"
          initialRecord={record}
          token={token}
          accounts={accounts}
          records={records}
          defaultAccountId={record.accountId}
          onSuccess={() => { onClose(); onSuccess(); }}
          onCancel={onClose}
          onGoToRecord={(id) => { onClose(); onGoToRecord(id); }}
        />
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-xs text-muted w-16 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ── Account Select ────────────────────────────────────────────────────────────

function AccountSelect({
  accounts,
  value,
  onChange,
  placeholder = "Select account",
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = accounts.find((a) => a.id === value);
  const filtered = search.trim()
    ? accounts.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setTimeout(() => inputRef.current?.focus(), 50); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-10 flex items-center justify-between gap-2 rounded-xl border-0 bg-[#1F1F1E] px-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              {(() => { const Icon = getAccountIcon(selected.accountType, selected.name); return <Icon weight="fill" className="size-4 shrink-0" style={{ color: selected.color ?? "var(--muted-foreground)" }} />; })()}
              <span className="truncate text-foreground">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 border-0 bg-[#1F1F1E] w-[var(--radix-popover-trigger-width)] pointer-events-auto overflow-hidden"
        style={{ maxHeight: "min(280px, var(--radix-popover-content-available-height, 280px))", display: "flex", flexDirection: "column" }}
        align="start"
        sideOffset={4}
      >
        <div className="p-2 shrink-0">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts…"
            className="w-full rounded-lg border-0 bg-[#1F1F1E] text-foreground text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
          />
        </div>
        <div className="overflow-y-auto flex-1 min-h-0" onWheel={(e) => e.stopPropagation()}>
          {filtered.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => select(a.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-default transition-colors ${i === filtered.length - 1 ? "rounded-b-md" : ""} ${a.id === value ? "font-semibold text-accent" : "text-foreground"}`}
            >
              {(() => { const Icon = getAccountIcon(a.accountType, a.name); return <Icon weight="fill" className="size-4 shrink-0" style={{ color: a.color ?? "var(--muted-foreground)" }} />; })()}
              <span className="truncate">{a.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted text-center">No accounts found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Category Select ───────────────────────────────────────────────────────────

function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = categories.find((c) => c.id === value);

  const filtered = search.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories;

  const groups = new Map<string, { groupId: string; items: Category[] }>();
  const ungrouped: Category[] = [];
  for (const c of filtered) {
    if (c.group) {
      const existing = groups.get(c.group.name);
      if (existing) {
        existing.items.push(c);
      } else {
        groups.set(c.group.name, { groupId: c.group.id, items: [c] });
      }
    } else {
      ungrouped.push(c);
    }
  }

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setTimeout(() => inputRef.current?.focus(), 50); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-10 flex items-center justify-between gap-2 rounded-xl border-0 bg-[#1F1F1E] px-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              {(() => {
                const Icon = getCategoryIcon(selected.name, selected.group?.name);
                const color = selected.color ?? "#888";
                return (
                  <span className="size-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}26`, color }}>
                    <Icon className="size-3" />
                  </span>
                );
              })()}
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted">Select category</span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 border-0 bg-[#1F1F1E] w-[var(--radix-popover-trigger-width)] pointer-events-auto"
        style={{ maxHeight: "min(280px, var(--radix-popover-content-available-height, 280px))", display: "flex", flexDirection: "column" }}
        align="start"
        sideOffset={4}
      >
        <div className="p-2 shrink-0">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="w-full rounded-lg border-0 bg-[#1F1F1E] text-foreground text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="overflow-y-auto flex-1 min-h-0" onWheel={(e) => e.stopPropagation()}>
          {[...groups.entries()].map(([groupName, { items }]) => (
            <div key={groupName}>
              <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">{groupName}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {items.map((c) => {
                const Icon = getCategoryIcon(c.name, groupName);
                const color = c.color ?? "#888";
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => select(c.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-default transition-colors ${c.id === value ? "font-semibold text-accent" : "text-foreground"}`}
                  >
                    <span className="size-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}26`, color }}>
                      <Icon className="size-3" />
                    </span>
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {ungrouped.map((c) => {
            const Icon = getCategoryIcon(c.name);
            const color = c.color ?? "#888";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-default transition-colors ${c.id === value ? "font-semibold text-accent" : "text-foreground"}`}
              >
                <span className="size-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}26`, color }}>
                  <Icon className="size-3" />
                </span>
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted text-center">No categories found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Shared Form ───────────────────────────────────────────────────────────────

function RecordForm({
  mode,
  initialRecord,
  token,
  accounts,
  records,
  defaultAccountId,
  onSuccess,
  onCancel,
  onGoToRecord,
}: {
  mode: "add" | "edit";
  initialRecord?: WalletRecord;
  token: string;
  accounts: Account[];
  records: WalletRecord[];
  defaultAccountId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onGoToRecord: (id: string) => void;
}) {
  const deriveType = (r?: WalletRecord): RecordType => {
    const t = r?.recordType?.toLowerCase();
    if (t === "expense" || t === "income" || t === "transfer") return t;
    return "expense";
  };

  const [recordType, setRecordType] = useState<RecordType>(() => deriveType(initialRecord));
  const [amount, setAmount] = useState<number | undefined>(() => initialRecord ? Math.abs(initialRecord.amount.value) : undefined);
  const [accountId, setAccountId] = useState(() => initialRecord?.accountId ?? defaultAccountId ?? "");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState(() => initialRecord?.category?.id ?? "");
  const [note, setNote] = useState(() => initialRecord?.note ?? "");
  const [payer, setPayer] = useState(() => initialRecord?.counterParty ?? "");
  const [paymentType, setPaymentType] = useState(() => initialRecord?.paymentType ?? "cash");
  const [recordState, setRecordState] = useState(() => initialRecord?.recordState ?? "cleared");
  const [recordDate, setRecordDate] = useState<Date>(() => new Date());

  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [apiSuggestions, setApiSuggestions] = useState<WalletRecord[]>([]);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionAbortRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const currencyCode = selectedAccount?.balance.currencyCode ?? initialRecord?.amount.currencyCode ?? "INR";

  useEffect(() => {
    if (!token) return;
    fetchCategories(token).then(setCategories).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (suggestionAbortRef.current) clearTimeout(suggestionAbortRef.current);
    setApiSuggestions([]);
    if (!note.trim() || !token) return;
    let cancelled = false;
    const q = note.trim();
    suggestionAbortRef.current = setTimeout(() => {
      Promise.all([
        fetchRecords(token, { from: "2000-01-01", limit: 10, note: q }),
        fetchRecords(token, { from: "2000-01-01", limit: 10, counterParty: q }),
      ]).then(([noteRes, cpRes]) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: WalletRecord[] = [];
        for (const r of [...noteRes.records, ...cpRes.records]) {
          if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
        }
        setApiSuggestions(merged.slice(0, 10));
      }).catch(() => {});
    }, 300);
    return () => {
      cancelled = true;
      if (suggestionAbortRef.current) clearTimeout(suggestionAbortRef.current);
    };
  }, [note, token]);

  useEffect(() => {
    if (defaultAccountId && accounts.length > 0 && !accountId) setAccountId(accounts[0].id);
  }, [accounts, accountId, defaultAccountId]);

  const filteredCategories = categories.filter((c) => {
    if (recordType === "transfer") return true;
    if (!c.categoryType) return true;
    return c.categoryType.toLowerCase() === recordType;
  });

  const suggestions = (() => {
    if (!note.trim()) return [];
    const seen = new Set<string>();
    const results: WalletRecord[] = [];
    for (const r of apiSuggestions) {
      if (mode === "edit" && r.id === initialRecord?.id) continue;
      const key = `${r.note ?? ""}|${r.counterParty ?? ""}|${r.accountId}|${r.category?.id ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(r);
    }
    return results;
  })();

  function applySuggestion(r: WalletRecord) {
    setNote(r.note ?? "");
    setPayer(r.counterParty ?? "");
    if (amount === undefined) setAmount(Math.abs(r.amount.value));
    if (!accountId) setAccountId(r.accountId);
    if (r.category?.id) setCategoryId(r.category.id);
    const rt = deriveType(r);
    setRecordType(rt);
    setPaymentType(r.paymentType ?? "cash");
    if (r.recordState) setRecordState(r.recordState);
    setShowSuggestions(false);
  }

  function handleNoteBlur() {
    blurTimer.current = setTimeout(() => setShowSuggestions(false), 150);
  }

  function handleSuggestionMouseDown() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }

  function setDateToday() {
    const d = new Date();
    d.setHours(recordDate.getHours(), recordDate.getMinutes());
    setRecordDate(d);
  }

  function setDateYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(recordDate.getHours(), recordDate.getMinutes());
    setRecordDate(d);
  }

  async function submit(addAnother: boolean | "sameDate") {
    if (amount === undefined || !accountId) return;
    setSubmitting(true);
    setError("");

    const signedAmount = recordType === "expense" ? -Math.abs(amount) : Math.abs(amount);

    const payload: Record<string, unknown> = {
      accountId,
      note: note || undefined,
      counterParty: payer || undefined,
      amount: { value: signedAmount, currencyCode },
      recordDate: recordDate.toISOString(),
      paymentType,
      recordState,
    };
    if (categoryId) payload.categoryId = categoryId;
    if (recordType === "transfer" && toAccountId) payload.toAccountId = toAccountId;

    try {
      let res: Response;
      if (mode === "edit" && initialRecord) {
        res = await fetch(`/api/wallet/records/${initialRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-wallet-token": token },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/wallet/records", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-wallet-token": token },
          body: JSON.stringify([payload]),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.message ?? err?.error ?? err?.errors?.[0]?.message ?? JSON.stringify(err);
        throw new Error(`HTTP ${res.status}: ${msg}`);
      }

      if (addAnother === "sameDate") {
        setAmount(undefined); setNote(""); setPayer(""); setCategoryId("");
        // recordDate is intentionally preserved
      } else if (addAnother) {
        setAmount(undefined); setNote(""); setPayer(""); setCategoryId("");
        setRecordDate(new Date());
      } else {
        onSuccess();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save record");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <DialogHeader className="px-6 pt-6 pb-4">
        <DialogTitle className="text-base font-semibold text-foreground">
          {mode === "edit" ? "Edit record" : "Add record"}
        </DialogTitle>
      </DialogHeader>

      {/* Body */}
      <div className="px-6 py-5">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex-1 space-y-4">
            <Tabs value={recordType} onValueChange={(v) => setRecordType(v as RecordType)}>
              <TabsList className="bg-[#1F1F1E] w-full">
                <TabsTrigger
                  value="expense"
                  className="flex-1 data-[state=active]:bg-danger data-[state=active]:text-white"
                >
                  Expense
                </TabsTrigger>
                <TabsTrigger
                  value="income"
                  className="flex-1 data-[state=active]:bg-success data-[state=active]:text-white"
                >
                  Income
                </TabsTrigger>
                <TabsTrigger value="transfer" className="flex-1">
                  Transfer
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">
                Amount <span className="text-danger">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex flex-1 rounded-xl border-0 bg-[#1F1F1E] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAmount((v) => Math.max(0, (v ?? 0) - 1))}
                    className="px-3 py-2 text-muted hover:text-foreground hover:bg-default transition-colors text-lg leading-none"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={amount ?? ""}
                    onChange={(e) => setAmount(e.target.value === "" ? undefined : Number(e.target.value))}
                    placeholder="0.00"
                    aria-label="Amount"
                    className="flex-1 min-w-0 bg-transparent text-center text-foreground text-sm focus:outline-none px-2 py-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount((v) => (v ?? 0) + 1)}
                    className="px-3 py-2 text-muted hover:text-foreground hover:bg-default transition-colors text-lg leading-none"
                  >
                    +
                  </button>
                </div>
                <div className="w-20 flex items-center justify-center rounded-xl border-0 bg-[#1F1F1E] px-3 text-sm font-mono text-muted">
                  {currencyCode}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Account</label>
              <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />
            </div>

            {recordType === "transfer" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">To Account</label>
                <AccountSelect
                  accounts={accounts.filter((a) => a.id !== accountId)}
                  value={toAccountId}
                  onChange={setToAccountId}
                  placeholder="Select account"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Category</label>
              <CategorySelect categories={filteredCategories} value={categoryId} onChange={setCategoryId} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Date &amp; Time</label>
              <DateTimePicker value={recordDate} onChange={setRecordDate} />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={setDateToday}
                  className="text-xs px-2.5 py-1 rounded-full border-0 bg-[#1F1F1E] text-muted hover:text-foreground hover:bg-default transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={setDateYesterday}
                  className="text-xs px-2.5 py-1 rounded-full border-0 bg-[#1F1F1E] text-muted hover:text-foreground hover:bg-default transition-colors"
                >
                  Yesterday
                </button>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:w-72 space-y-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Note</label>
              <Textarea
                placeholder="Describe your record"
                value={note}
                onChange={(e) => { setNote(e.target.value); setShowSuggestions(true); }}
                onFocus={() => note.trim() && setShowSuggestions(true)}
                onBlur={handleNoteBlur}
                aria-label="Note"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && suggestions.length > 0}
                rows={3}
                className="text-foreground placeholder:text-muted rounded-xl resize-none"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div onMouseDown={handleSuggestionMouseDown} className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border-0 bg-[#1F1F1E] shadow-lg overflow-hidden">
                  {suggestions.map((r) => {
                    const positive = r.amount.value > 0;
                    return (
                      <div key={r.id} className="flex items-center hover:bg-default transition-colors">
                        <button type="button" onClick={() => applySuggestion(r)} className="flex-1 px-3 py-2.5 text-left min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.note || "—"}</p>
                          {(r.counterParty || r.category) && (
                            <p className="text-xs text-muted truncate">
                              {[r.counterParty, r.category?.name].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-xs text-muted truncate">{r.accountName}{r.category ? ` · ${r.category.name}` : ""}</p>
                            <span className={`text-xs font-mono shrink-0 ${positive ? "text-success" : "text-danger"}`}>
                              {positive ? "+" : ""}{fmt(r.amount.value, r.amount.currencyCode)}
                            </span>
                          </div>
                        </button>
                        <button type="button" onClick={() => onGoToRecord(r.id)} title="Go to this record" className="px-2 py-2.5 text-muted hover:text-foreground transition-colors shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Payer</label>
              <Input
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                aria-label="Payer"
                className="text-foreground placeholder:text-muted rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Payment type</label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-foreground focus:bg-default focus:text-foreground">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Payment status</label>
              <Select value={recordState} onValueChange={setRecordState}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECORD_STATES.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-foreground focus:bg-default focus:text-foreground">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 pt-2 flex gap-2">
        {mode === "add" && (
          <>
            <Button
              variant="outline"
              className="flex-1 border-border text-foreground hover:bg-default hover:text-foreground"
              onClick={() => submit(true)}
              disabled={amount === undefined || !accountId || submitting}
            >
              Add another
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-border text-foreground hover:bg-default hover:text-foreground"
              onClick={() => submit("sameDate")}
              disabled={amount === undefined || !accountId || submitting}
            >
              Add, keep date
            </Button>
          </>
        )}
        <Button
          className={mode === "add" ? "flex-1" : "w-full"}
          onClick={() => submit(false)}
          disabled={amount === undefined || !accountId || submitting}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Saving…
            </span>
          ) : (
            mode === "edit" ? "Save changes" : "Add record"
          )}
        </Button>
      </div>
    </div>
  );
}
