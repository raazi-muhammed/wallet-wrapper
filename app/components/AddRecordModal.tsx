"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ModalTemplate } from "@/templates/modal-template";
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
import { createRecords, patchRecords, deleteRecords } from "../actions";
import { fetchRecords } from "@/lib/wallet-fetch";
import type { Account, Category, WalletRecord } from "../actions";
import type { CreateRecordRequest, PatchRecordItem } from "@/lib/wallet-client";
import { getCategoryIcon, getAccountIcon } from "@/lib/utils";
import { useCategories, useLabels, useCreateLabel } from "@/hooks/use-wallet-data";
import { ErrorBox, LabelChip, LabelSelect, ToggleRow, unwrap } from "./EditControls";
import { formatMoney } from "@/lib/format";
import { RECORD_STATES, recordDeleteGroup, type EditableState } from "@/lib/records";

type RecordType = "expense" | "income" | "transfer";
type ClearableField = NonNullable<PatchRecordItem["$clear"]>[number];

/** Single characters match nearly everything, so suggestions wait for a second one. */
const MIN_SUGGESTION_QUERY_LENGTH = 2;

function toDatetimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

// ── Add Record Modal ──────────────────────────────────────────────────────────

export function AddRecordModal({ session, accounts, defaultAccountId, isOpen, onClose, onSuccess, onOpenRecord }: {
  session: string;
  accounts: Account[];
  defaultAccountId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenRecord: (record: WalletRecord) => void;
}) {
  return (
    <ModalTemplate
      open={isOpen}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title="Add record"
      className="max-w-[720px] max-h-[90vh] flex flex-col gap-0"
      bodyClassName="flex flex-col flex-1 min-h-0 p-0"
    >
      <RecordForm
        mode="add"
        session={session}
        accounts={accounts}
        defaultAccountId={defaultAccountId}
        onSuccess={() => { onClose(); onSuccess(); }}
        onCancel={onClose}
        onOpenRecord={onOpenRecord}
      />
    </ModalTemplate>
  );
}

// ── Record Detail Modal ───────────────────────────────────────────────────────

export function RecordDetailModal({ record, accounts, isOpen, onClose, onDuplicate, onEdit, onDeleted }: {
  record: WalletRecord;
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  onDeleted?: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { mutate: runDelete, isPending: deleting, error: deleteError } = useMutation({
    // Paired transfers can only be deleted together with their mirror record.
    mutationFn: async () => unwrap(await deleteRecords([recordDeleteGroup(record)])),
    onSuccess: () => { onClose(); onDeleted?.(); },
  });

  const account = accounts.find((a) => a.id === record.accountId);
  const accountIcon = getAccountIcon(account?.accountType ?? "", record.accountName);
  const accountColor = account?.color ?? "var(--muted-foreground)";
  const categoryIcon = getCategoryIcon(record.category?.name ?? "", record.category?.group?.name);

  const positive = record.amount.value > 0;
  const recordType = record.recordType?.toLowerCase();
  const typeLabel = recordType === "income" ? "Income" : recordType === "transfer" ? "Transfer" : "Expense";

  const stateLabel = RECORD_STATES.find((s) => s.id === record.recordState)?.label ?? record.recordState ?? "—";

  const date = record.recordDate ? new Date(record.recordDate) : null;
  const dateStr = date
    ? date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const timeStr = date
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <ModalTemplate
      open={isOpen}
      onOpenChange={(o) => { if (!o) onClose(); }}
      className="max-w-sm gap-4"
      bodyClassName="px-4 sm:px-6 pt-0 pb-0 space-y-0"
      title="Record Details"
    >
      <div className="space-y-3.5">
        <p className={`text-3xl font-bold tabular-nums ${positive ? "text-success" : "text-danger"}`}>
          {positive ? "+" : ""}{formatMoney(record.amount.value, record.amount.currencyCode)}
        </p>

        <DetailRow label="Category">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-full bg-muted flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={categoryIcon} className="size-3" />
            </div>
            <span className="text-sm">{record.category?.name ?? "—"}</span>
            {record.category?.group && (
              <span className="text-xs text-muted">· {record.category.group.name}</span>
            )}
          </div>
        </DetailRow>

        <DetailRow label="Account">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={accountIcon} className="size-4 shrink-0" style={{ color: accountColor }} />
            <span className="text-sm">{record.accountName}</span>
          </div>
        </DetailRow>

        <DetailRow label="Date">
          <span className="text-sm">{dateStr}{timeStr ? ` · ${timeStr}` : ""}</span>
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

        {record.labels.length > 0 && (
          <DetailRow label="Labels">
            <div className="flex flex-wrap gap-1">
              {record.labels.map((l) => <LabelChip key={l.id} label={l} />)}
            </div>
          </DetailRow>
        )}

        {(record.place?.name || record.place?.address) && (
          <DetailRow label="Place">
            <span className="text-sm">{record.place.name}</span>
            {record.place.address && <span className="block text-xs text-muted">{record.place.address}</span>}
          </DetailRow>
        )}
      </div>

      <div className="pb-5 space-y-2">
        <ErrorBox error={deleteError} />
        <div className="grid grid-cols-2 gap-2">
          {onEdit && (
            <Button onClick={() => { onClose(); onEdit(); }} className={onDuplicate ? "" : "col-span-2"}>
              Edit
            </Button>
          )}
          {onDuplicate && (
            <Button variant="card" onClick={() => { onClose(); onDuplicate(); }} className={onEdit ? "" : "col-span-2"}>
              Duplicate
            </Button>
          )}
        </div>
        {confirmingDelete ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={deleting}>Keep</Button>
            <Button variant="destructive" onClick={() => runDelete()} disabled={deleting}>
              {deleting ? "Deleting…" : record.transfer?.paired ? "Delete both legs" : "Confirm delete"}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="w-full text-danger hover:text-danger" onClick={() => setConfirmingDelete(true)}>
            Delete record
          </Button>
        )}
      </div>
    </ModalTemplate>
  );
}

export function DuplicateRecordModal({ record, session, accounts, isOpen, onClose, onSuccess, onOpenRecord }: {
  record: WalletRecord;
  session: string;
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenRecord: (record: WalletRecord) => void;
}) {
  return (
    <ModalTemplate
      open={isOpen}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title="Add record"
      className="max-w-[720px] max-h-[90vh] flex flex-col gap-0"
      bodyClassName="flex flex-col flex-1 min-h-0 p-0"
    >
      <RecordForm
        mode="add"
        initialRecord={record}
        session={session}
        accounts={accounts}
        defaultAccountId={record.accountId}
        onSuccess={() => { onClose(); onSuccess(); }}
        onCancel={onClose}
        onOpenRecord={(rec) => { onClose(); onOpenRecord(rec); }}
      />
    </ModalTemplate>
  );
}

export function EditRecordModal({ record, session, accounts, isOpen, onClose, onSuccess, onOpenRecord }: {
  record: WalletRecord;
  session: string;
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenRecord: (record: WalletRecord) => void;
}) {
  return (
    <ModalTemplate
      open={isOpen}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title="Edit record"
      className="max-w-[720px] max-h-[90vh] flex flex-col gap-0"
      bodyClassName="flex flex-col flex-1 min-h-0 p-0"
    >
      <RecordForm
        mode="edit"
        initialRecord={record}
        session={session}
        accounts={accounts}
        onSuccess={() => { onClose(); onSuccess(); }}
        onCancel={onClose}
        onOpenRecord={(rec) => { onClose(); onOpenRecord(rec); }}
      />
    </ModalTemplate>
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

export function AccountSelect({
  accounts,
  value,
  onChange,
  placeholder = "Select account",
  disabled,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
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
          disabled={disabled}
          className="w-full h-10 flex items-center justify-between gap-2 rounded-lg border-0 bg-card px-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              {(() => { const icon = getAccountIcon(selected.accountType, selected.name); return <HugeiconsIcon icon={icon} className="size-4 shrink-0" style={{ color: selected.color ?? "var(--muted-foreground)" }} />; })()}
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
        className="p-0 border-0 bg-card w-[var(--radix-popover-trigger-width)] pointer-events-auto overflow-hidden"
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
            className="w-full rounded-lg border-0 bg-card text-foreground text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
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
              {(() => { const icon = getAccountIcon(a.accountType, a.name); return <HugeiconsIcon icon={icon} className="size-4 shrink-0" style={{ color: a.color ?? "var(--muted-foreground)" }} />; })()}
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

export function CategorySelect({
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
          className="w-full h-10 flex items-center justify-between gap-2 rounded-lg border-0 bg-card px-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              {(() => {
                const icon = getCategoryIcon(selected.name, selected.group?.name);
                const color = selected.color ?? "#888";
                return (
                  <span className="size-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}26`, color }}>
                    <HugeiconsIcon icon={icon} className="size-3" />
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
        className="p-0 border-0 bg-card w-[var(--radix-popover-trigger-width)] pointer-events-auto"
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
            className="w-full rounded-lg border-0 bg-card text-foreground text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
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
                const icon = getCategoryIcon(c.name, groupName);
                const color = c.color ?? "#888";
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => select(c.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-default transition-colors ${c.id === value ? "font-semibold text-accent" : "text-foreground"}`}
                  >
                    <span className="size-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}26`, color }}>
                      <HugeiconsIcon icon={icon} className="size-3" />
                    </span>
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {ungrouped.map((c) => {
            const icon = getCategoryIcon(c.name);
            const color = c.color ?? "#888";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-default transition-colors ${c.id === value ? "font-semibold text-accent" : "text-foreground"}`}
              >
                <span className="size-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}26`, color }}>
                  <HugeiconsIcon icon={icon} className="size-3" />
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

// ── Edit patch ────────────────────────────────────────────────────────────────

/**
 * Builds a PATCH item holding only the fields that changed, so an untouched
 * amount doesn't reset the record's currency and locked fields are never sent.
 * Emptied fields go through `$clear`, since omitting a field means "no change".
 * Returns null when nothing changed.
 */
function buildRecordPatch(original: WalletRecord, next: {
  signedAmount: number;
  accountId: string;
  categoryId: string;
  note: string;
  payer: string;
  recordDate: Date;
  recordState: EditableState;
  labelIds: string[];
  place: PatchRecordItem["place"];
  lockAmountDateState: boolean;
  unlinkTransfer: boolean;
}): PatchRecordItem | null {
  const patch: PatchRecordItem = { id: original.id };
  const clear: ClearableField[] = [];

  if (!next.lockAmountDateState) {
    if (next.signedAmount !== original.amount.value) patch.amount = { value: next.signedAmount };
    if (next.recordDate.getTime() !== new Date(original.recordDate).getTime()) patch.recordDate = next.recordDate.toISOString();
    // States outside the editable three (e.g. "void") show as "cleared" in the form; only send a real change.
    const shownState = RECORD_STATES.some((s) => s.id === original.recordState) ? original.recordState : "cleared";
    if (next.recordState !== shownState) patch.recordState = next.recordState;
  }
  if (next.accountId !== original.accountId) patch.accountId = next.accountId;

  if (next.categoryId !== (original.category?.id ?? "")) {
    if (next.categoryId) patch.categoryId = next.categoryId; else clear.push("categoryId");
  }
  if (next.note !== (original.note ?? "")) {
    if (next.note) patch.note = next.note; else clear.push("note");
  }
  if (next.payer !== (original.counterParty ?? "")) {
    if (next.payer) patch.counterParty = next.payer; else clear.push("counterParty");
  }

  const before = original.labels.map((l) => l.id);
  const add = next.labelIds.filter((id) => !before.includes(id));
  const remove = before.filter((id) => !next.labelIds.includes(id));
  if (next.labelIds.length === 0 && before.length > 0) clear.push("labelIds");
  else if (add.length > 0 || remove.length > 0) {
    patch.labelIds = { ...(add.length > 0 ? { add } : {}), ...(remove.length > 0 ? { remove } : {}) };
  }

  const hadPlace = !!(original.place?.name || original.place?.address);
  if (!next.place && hadPlace) clear.push("place");
  else if (next.place && (next.place.name !== original.place?.name || next.place.address !== original.place?.address)) {
    patch.place = next.place;
  }

  if (next.unlinkTransfer) clear.push("transfer");
  if (clear.length > 0) patch.$clear = clear;

  return Object.keys(patch).length > 1 ? patch : null;
}

// ── Shared Form ───────────────────────────────────────────────────────────────

function RecordForm({
  mode,
  initialRecord,
  session,
  accounts,
  defaultAccountId,
  onSuccess,
  onCancel,
  onOpenRecord,
}: {
  mode: "add" | "edit";
  initialRecord?: WalletRecord;
  session: string;
  accounts: Account[];
  defaultAccountId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onOpenRecord: (record: WalletRecord) => void;
}) {
  const deriveType = (r?: WalletRecord): RecordType => {
    const t = r?.recordType?.toLowerCase();
    if (t === "expense" || t === "income" || t === "transfer") return t;
    return "expense";
  };

  const isEdit = mode === "edit" && !!initialRecord;
  // Paired transfers have a mirror on another account; the API locks their amount, date and state.
  const pairedTransfer = isEdit && !!initialRecord.transfer?.paired;
  const isTransferRecord = isEdit && !!initialRecord.transfer;
  const initialState: EditableState = (RECORD_STATES.some((s) => s.id === initialRecord?.recordState) ? initialRecord?.recordState : "cleared") as EditableState;

  const [recordType, setRecordType] = useState<RecordType>(() => deriveType(initialRecord));
  const [amount, setAmount] = useState<number | undefined>(() => initialRecord ? Math.abs(initialRecord.amount.value) : undefined);
  const [accountId, setAccountId] = useState(() => initialRecord?.accountId ?? defaultAccountId ?? "");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState(() => initialRecord?.category?.id ?? "");
  const [note, setNote] = useState(() => initialRecord?.note ?? "");
  const [payer, setPayer] = useState(() => initialRecord?.counterParty ?? "");
  const [recordState, setRecordState] = useState<EditableState>(initialState);
  const [recordDate, setRecordDate] = useState<Date>(() => isEdit ? new Date(initialRecord.recordDate) : new Date());
  const [labelIds, setLabelIds] = useState<string[]>(() => initialRecord?.labels.map((l) => l.id) ?? []);
  const [placeName, setPlaceName] = useState(() => initialRecord?.place?.name ?? "");
  const [placeAddress, setPlaceAddress] = useState(() => initialRecord?.place?.address ?? "");
  const [unlinkTransfer, setUnlinkTransfer] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedNote, setDebouncedNote] = useState(note);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showPayerSuggestions, setShowPayerSuggestions] = useState(false);
  const [debouncedPayer, setDebouncedPayer] = useState(payer);
  const payerBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const currencyCode = selectedAccount?.balance.currencyCode ?? initialRecord?.amount.currencyCode ?? "INR";

  // A record can only move between non-bank-synced accounts that share its account's currency.
  const originalAccount = isEdit ? accounts.find((a) => a.id === initialRecord.accountId) : undefined;
  const accountLocked = isEdit && initialRecord.accountIsBankSync;
  const accountOptions = isEdit
    ? accounts.filter((a) => a.id === initialRecord.accountId || (!a.isBankSync && a.balance.currencyCode === originalAccount?.balance.currencyCode))
    : accounts;

  // Debounce note for suggestions query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedNote(note), 300);
    return () => clearTimeout(t);
  }, [note]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPayer(payer), 300);
    return () => clearTimeout(t);
  }, [payer]);

  const { data: categories = [] } = useCategories(session);
  const { data: labels = [] } = useLabels(session);
  const createLabel = useCreateLabel(session, (id) => setLabelIds((ids) => [...ids, id]));

  const { data: apiSuggestions = [] } = useQuery({
    queryKey: ["noteSuggestions", session, debouncedNote],
    queryFn: async () => {
      const q = debouncedNote.trim();
      const [noteRes, cpRes] = await Promise.all([
        fetchRecords({ from: "2000-01-01", limit: 10, note: q }),
        fetchRecords({ from: "2000-01-01", limit: 10, counterParty: q }),
      ]);
      const seen = new Set<string>();
      const merged: WalletRecord[] = [];
      for (const r of [...noteRes.records, ...cpRes.records]) {
        if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
      }
      return merged.slice(0, 10);
    },
    enabled: !!session && debouncedNote.trim().length >= MIN_SUGGESTION_QUERY_LENGTH,
    staleTime: 30_000,
    placeholderData: [] as WalletRecord[],
  });

  const { data: apiPayerSuggestions = [] } = useQuery({
    queryKey: ["payerSuggestions", session, debouncedPayer],
    queryFn: async () => {
      const q = debouncedPayer.trim();
      const res = await fetchRecords({ from: "2000-01-01", limit: 20, counterParty: q });
      const seen = new Set<string>();
      const names: string[] = [];
      for (const r of res.records) {
        const cp = r.counterParty?.trim();
        if (cp && !seen.has(cp)) { seen.add(cp); names.push(cp); }
      }
      return names.slice(0, 8);
    },
    enabled: !!session && debouncedPayer.trim().length >= MIN_SUGGESTION_QUERY_LENGTH,
    staleTime: 30_000,
    placeholderData: [] as string[],
  });

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
    if (!isEdit || rt !== "transfer") setRecordType(rt);
    const state = RECORD_STATES.find((s) => s.id === r.recordState);
    if (state) setRecordState(state.id);
    if (r.labels.length > 0) setLabelIds(r.labels.map((l) => l.id));
    setShowSuggestions(false);
  }

  function handleNoteBlur() {
    blurTimer.current = setTimeout(() => setShowSuggestions(false), 150);
  }

  function handleSuggestionMouseDown() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }

  function handlePayerBlur() {
    payerBlurTimer.current = setTimeout(() => setShowPayerSuggestions(false), 150);
  }

  function handlePayerSuggestionMouseDown() {
    if (payerBlurTimer.current) clearTimeout(payerBlurTimer.current);
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

  const { mutate: runSubmit, isPending: submitting, error: submitError, reset: resetSubmitError } = useMutation({
    mutationFn: async (addAnother: boolean | "sameDate") => {
      if (amount === undefined || !accountId) throw new Error("Missing required fields");
      if (amount === 0) throw new Error("Amount must not be zero");

      const place = placeName.trim() || placeAddress.trim()
        ? { ...initialRecord?.place, name: placeName.trim() || undefined, address: placeAddress.trim() || undefined }
        : undefined;

      if (isEdit) {
        const patch = buildRecordPatch(initialRecord, {
          signedAmount: isTransferRecord
            ? Math.sign(initialRecord.amount.value) * Math.abs(amount)
            : recordType === "expense" ? -Math.abs(amount) : Math.abs(amount),
          accountId, categoryId, note, payer, recordDate, recordState, labelIds, place,
          lockAmountDateState: pairedTransfer,
          unlinkTransfer,
        });
        if (patch) unwrap(await patchRecords([patch]));
        return addAnother;
      }

      const base = {
        note: note || undefined,
        counterParty: payer || undefined,
        recordDate: recordDate.toISOString(),
        recordState,
        ...(categoryId ? { categoryId } : {}),
        ...(labelIds.length > 0 ? { labelIds } : {}),
        ...(place ? { place } : {}),
      } satisfies Partial<CreateRecordRequest>;

      if (recordType === "transfer" && toAccountId) {
        // One record plus `pairingMode: "new"` makes the API create the linked mirror on the target account.
        unwrap(await createRecords([
          { ...base, accountId, amount: { value: -Math.abs(amount), currencyCode }, transfer: { pairingMode: "new", accountId: toAccountId } },
        ]));
      } else {
        const signedAmount = recordType === "expense" ? -Math.abs(amount) : Math.abs(amount);
        unwrap(await createRecords([
          { ...base, accountId, amount: { value: signedAmount, currencyCode } },
        ]));
      }

      return addAnother;
    },
    onSuccess: (addAnother) => {
      if (addAnother === "sameDate") {
        setAmount(undefined); setNote(""); setPayer(""); setCategoryId(""); setLabelIds([]); setPlaceName(""); setPlaceAddress("");
      } else if (addAnother) {
        setAmount(undefined); setNote(""); setPayer(""); setCategoryId(""); setLabelIds([]); setPlaceName(""); setPlaceAddress("");
        setRecordDate(new Date());
      } else {
        onSuccess();
      }
    },
  });

  const error = submitError instanceof Error ? submitError.message : "";

  function submit(addAnother: boolean | "sameDate") {
    resetSubmitError();
    runSubmit(addAnother);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Body */}
      <div className="px-4 sm:px-6 py-5 flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex-1 space-y-4">
            {isTransferRecord ? (
              <div className="space-y-2">
                <p className="rounded-lg bg-card px-3 py-2.5 text-sm text-muted">
                  {pairedTransfer
                    ? "Paired transfer: the amount, date and status are locked because a linked record exists on another account."
                    : "Unpaired transfer"}
                </p>
                <ToggleRow
                  label="Remove transfer link"
                  description="Turns this into a regular record and sets its category to Unknown"
                  checked={unlinkTransfer}
                  onChange={setUnlinkTransfer}
                />
              </div>
            ) : (
              <Tabs value={recordType} onValueChange={(v) => setRecordType(v as RecordType)}>
                <TabsList className="bg-card w-full">
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
                  {!isEdit && (
                    <TabsTrigger value="transfer" className="flex-1">
                      Transfer
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
            )}

            <fieldset disabled={pairedTransfer} className="min-w-0 disabled:opacity-60">

              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">
                Amount <span className="text-danger">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex flex-1 rounded-lg border-0 bg-card overflow-hidden">
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
                <div className="w-20 flex items-center justify-center rounded-lg border-0 bg-card px-3 text-sm font-mono text-muted">
                  {currencyCode}
                </div>
              </div>
            </fieldset>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Account</label>
              <AccountSelect accounts={accountOptions} value={accountId} onChange={setAccountId} disabled={accountLocked} />
              {accountLocked && <p className="text-xs text-muted mt-1 pl-3">Records on bank-synced accounts can&apos;t be moved.</p>}
            </div>

            {recordType === "transfer" && !isEdit && (
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

            {recordType !== "transfer" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Category</label>
                <CategorySelect categories={filteredCategories} value={categoryId} onChange={setCategoryId} />
              </div>
            )}

            <fieldset disabled={pairedTransfer} className="min-w-0 disabled:opacity-60">
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Date &amp; Time</label>
              <DateTimePicker value={recordDate} onChange={setRecordDate} />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={setDateToday}
                  className="text-xs px-2.5 py-1 rounded-full border-0 bg-card text-muted hover:text-foreground hover:bg-default transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={setDateYesterday}
                  className="text-xs px-2.5 py-1 rounded-full border-0 bg-card text-muted hover:text-foreground hover:bg-default transition-colors"
                >
                  Yesterday
                </button>
              </div>
            </fieldset>
          </div>

          {/* Right column */}
          <div className="lg:w-72 space-y-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Note</label>
              <Textarea
                placeholder="Describe your record"
                value={note}
                maxLength={255}
                onChange={(e) => { setNote(e.target.value); setShowSuggestions(true); }}
                onFocus={() => note.trim() && setShowSuggestions(true)}
                onBlur={handleNoteBlur}
                aria-label="Note"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && suggestions.length > 0}
                rows={3}
                className="text-foreground placeholder:text-muted rounded-lg resize-none"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div onMouseDown={handleSuggestionMouseDown} className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border-0 bg-card shadow-lg overflow-hidden">
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
                              {positive ? "+" : ""}{formatMoney(r.amount.value, r.amount.currencyCode)}
                            </span>
                          </div>
                        </button>
                        <button type="button" onClick={() => onOpenRecord(r)} title="Go to this record" className="px-2 py-2.5 text-muted hover:text-foreground transition-colors shrink-0">
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

            <div className="relative">
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Payer</label>
              <Input
                value={payer}
                maxLength={255}
                onChange={(e) => { setPayer(e.target.value); setShowPayerSuggestions(true); }}
                onFocus={() => payer.trim() && setShowPayerSuggestions(true)}
                onBlur={handlePayerBlur}
                aria-label="Payer"
                aria-autocomplete="list"
                aria-expanded={showPayerSuggestions && apiPayerSuggestions.length > 0}
                className="text-foreground placeholder:text-muted rounded-lg"
              />
              {showPayerSuggestions && apiPayerSuggestions.length > 0 && (
                <div onMouseDown={handlePayerSuggestionMouseDown} className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border-0 bg-card shadow-lg overflow-hidden">
                  {apiPayerSuggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { setPayer(name); setShowPayerSuggestions(false); }}
                      className="w-full px-3 py-2.5 text-left text-sm text-foreground hover:bg-default transition-colors truncate"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Labels</label>
              <LabelSelect labels={labels} value={labelIds} onChange={setLabelIds} onCreate={createLabel} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Place</label>
              <div className="space-y-2">
                <Input
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  maxLength={255}
                  placeholder="Name"
                  aria-label="Place name"
                  className="text-foreground placeholder:text-muted rounded-lg"
                />
                <Input
                  value={placeAddress}
                  onChange={(e) => setPlaceAddress(e.target.value)}
                  maxLength={255}
                  placeholder="Address"
                  aria-label="Place address"
                  className="text-foreground placeholder:text-muted rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">Payment status</label>
              <Select value={recordState} onValueChange={(v) => setRecordState(v as EditableState)} disabled={pairedTransfer}>
                <SelectTrigger className="w-full rounded-lg">
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
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 pb-6 pt-2 flex flex-col sm:flex-row gap-2 shrink-0">
        {mode === "add" && (
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <Button
              variant="card"
              className="sm:flex-1"
              onClick={() => submit(true)}
              disabled={amount === undefined || !accountId || submitting}
            >
              Add another
            </Button>
            <Button
              variant="card"
              className="sm:flex-1"
              onClick={() => submit("sameDate")}
              disabled={amount === undefined || !accountId || submitting}
            >
              Add, keep date
            </Button>
          </div>
        )}
        <Button
          className={mode === "add" ? "sm:flex-1" : "w-full"}
          onClick={() => submit(false)}
          disabled={amount === undefined || !accountId || submitting}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" /> Saving…
            </span>
          ) : (
            mode === "edit" ? "Save changes" : "Add record"
          )}
        </Button>
      </div>
    </div>
  );
}
