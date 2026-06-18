"use client";

import { useState, useEffect, useRef } from "react";
import {
  Modal,
  Button,
  Input,
  Select,
  ListBox,
  ListBoxItem,
  useOverlayState,
  Tabs,
  NumberField,
  TextArea,
  Separator,
  Spinner,
  DateField,
  DatePicker,
  Calendar,
} from "@heroui/react";
import { parseAbsoluteToLocal, getLocalTimeZone, today } from "@internationalized/date";
import type { ZonedDateTime } from "@internationalized/date";
import { fetchCategories } from "../actions";
import type { Account, Category, WalletRecord } from "../actions";

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

// ── Add Record Button ─────────────────────────────────────────────────────────

interface AddProps {
  token: string;
  accounts: Account[];
  records: WalletRecord[];
  onSuccess: () => void;
  onGoToRecord: (id: string) => void;
}

export function AddRecordButton({ token, accounts, records, onSuccess, onGoToRecord }: AddProps) {
  const state = useOverlayState();

  return (
    <>
      <Button variant="primary" onPress={state.open} isDisabled={!token}>
        + Add Record
      </Button>
      <Modal state={state}>
        <Modal.Backdrop>
          <Modal.Container scroll="inside">
            <Modal.Dialog style={{ maxWidth: "720px", width: "100%" }}>
              <RecordForm
                mode="add"
                token={token}
                accounts={accounts}
                records={records}
                onSuccess={() => { state.close(); onSuccess(); }}
                onCancel={state.close}
                onGoToRecord={(id) => { state.close(); onGoToRecord(id); }}
              />
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

// ── Edit Record Modal ─────────────────────────────────────────────────────────

interface EditProps {
  token: string;
  accounts: Account[];
  records: WalletRecord[];
  record: WalletRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onGoToRecord: (id: string) => void;
}

export function EditRecordModal({ token, accounts, records, record, isOpen, onClose, onSuccess, onGoToRecord }: EditProps) {
  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => { if (!open) onClose(); },
  });

  return (
    <Modal state={state}>
      <Modal.Backdrop>
        <Modal.Container scroll="inside">
          <Modal.Dialog style={{ maxWidth: "720px", width: "100%" }}>
            <RecordForm
              mode="edit"
              initialRecord={record}
              token={token}
              accounts={accounts}
              records={records}
              onSuccess={() => { onClose(); onSuccess(); }}
              onCancel={onClose}
              onGoToRecord={(id) => { onClose(); onGoToRecord(id); }}
            />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
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
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleBlur() {
    blurRef.current = setTimeout(() => setOpen(false), 150);
  }

  function handleMouseDown() {
    if (blurRef.current) clearTimeout(blurRef.current);
  }

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        onBlur={handleBlur}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            {selected.color && (
              <span className="size-3 rounded-full shrink-0" style={{ background: selected.color }} />
            )}
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-muted">Select category</span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div onMouseDown={handleMouseDown} className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-background shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: "280px" }}>
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories…"
              className="w-full rounded-lg border border-border bg-background text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="overflow-y-auto">
            {[...groups.entries()].map(([groupName, { items }]) => (
              <div key={groupName}>
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">{groupName}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {items.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => select(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-default transition-colors ${c.id === value ? "font-semibold text-accent" : "text-foreground"}`}
                  >
                    {c.color && <span className="size-3 rounded-full shrink-0" style={{ background: c.color }} />}
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            ))}
            {ungrouped.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-default transition-colors ${c.id === value ? "font-semibold text-accent" : "text-foreground"}`}
              >
                {c.color && <span className="size-3 rounded-full shrink-0" style={{ background: c.color }} />}
                <span className="truncate">{c.name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted text-center">No categories found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared Form ───────────────────────────────────────────────────────────────

function RecordForm({
  mode,
  initialRecord,
  token,
  accounts,
  records,
  onSuccess,
  onCancel,
  onGoToRecord,
}: {
  mode: "add" | "edit";
  initialRecord?: WalletRecord;
  token: string;
  accounts: Account[];
  records: WalletRecord[];
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
  const [accountId, setAccountId] = useState(() => initialRecord?.accountId ?? accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState(() => initialRecord?.category?.id ?? "");
  const [note, setNote] = useState(() => initialRecord?.note ?? "");
  const [payer, setPayer] = useState(() => initialRecord?.counterParty ?? "");
  const [paymentType, setPaymentType] = useState(() => initialRecord?.paymentType ?? "cash");
  const [recordState, setRecordState] = useState(() => initialRecord?.recordState ?? "cleared");
  const [recordDate, setRecordDate] = useState<ZonedDateTime>(() => parseAbsoluteToLocal(new Date().toISOString()));

  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const currencyCode = selectedAccount?.balance.currencyCode ?? initialRecord?.amount.currencyCode ?? "INR";

  useEffect(() => {
    if (!token) return;
    fetchCategories(token).then(setCategories).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const filteredCategories = categories.filter((c) => {
    if (recordType === "transfer") return true;
    if (!c.categoryType) return true;
    return c.categoryType.toLowerCase() === recordType;
  });

  const suggestions = (() => {
    if (!note.trim()) return [];
    const q = note.toLowerCase();
    const seen = new Set<string>();
    const results: WalletRecord[] = [];
    for (const r of records) {
      if (mode === "edit" && r.id === initialRecord?.id) continue;
      const noteText = (r.note ?? "").toLowerCase();
      const payeeText = (r.counterParty ?? "").toLowerCase();
      if (!noteText.includes(q) && !payeeText.includes(q)) continue;
      const key = `${r.note ?? ""}|${r.counterParty ?? ""}|${r.accountId}|${r.category?.id ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(r);
      if (results.length >= 8) break;
    }
    return results;
  })();

  function applySuggestion(r: WalletRecord) {
    setNote(r.note ?? "");
    setPayer(r.counterParty ?? "");
    setAmount(Math.abs(r.amount.value));
    setAccountId(r.accountId);
    if (r.category?.id) setCategoryId(r.category.id);
    const rt = deriveType(r);
    setRecordType(rt);
    setPaymentType(r.paymentType ?? "Cash");
    if (r.recordState) setRecordState(r.recordState);
    setShowSuggestions(false);
  }

  function handleNoteBlur() {
    blurTimer.current = setTimeout(() => setShowSuggestions(false), 150);
  }

  function handleSuggestionMouseDown() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }

  async function submit(addAnother: boolean) {
    if (amount === undefined || !accountId) return;
    setSubmitting(true);
    setError("");

    const signedAmount = recordType === "expense" ? -Math.abs(amount) : Math.abs(amount);

    const payload: Record<string, unknown> = {
      accountId,
      note: note || undefined,
      counterParty: payer || undefined,
      amount: { value: signedAmount, currencyCode },
      recordDate: recordDate.toDate().toISOString(),
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

      if (addAnother) {
        setAmount(undefined); setNote(""); setPayer(""); setCategoryId("");
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
    <>
      <Modal.Header>
        <Modal.Heading>{mode === "edit" ? "Edit record" : "Add record"}</Modal.Heading>
        <Modal.CloseTrigger />
      </Modal.Header>

      <Modal.Body>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex-1 space-y-4">
            <Tabs selectedKey={recordType} onSelectionChange={(k) => setRecordType(k as RecordType)}>
              <Tabs.List>
                <Tabs.Tab id="expense" className="data-[selected]:bg-danger data-[selected]:text-white">Expense</Tabs.Tab>
                <Tabs.Tab id="income" className="data-[selected]:bg-success data-[selected]:text-white">Income</Tabs.Tab>
                <Tabs.Tab id="transfer">Transfer</Tabs.Tab>
              </Tabs.List>
            </Tabs>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Amount <span className="text-danger">*</span></label>
              <div className="flex gap-2">
                <NumberField
                  minValue={0}
                  step={1}
                  value={amount ?? NaN}
                  onChange={(v) => setAmount(isNaN(v) ? undefined : v)}
                  aria-label="Amount"
                  className="flex-1"
                >
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input placeholder="0.00" />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                </NumberField>
                <div className="w-20 flex items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-mono text-muted">
                  {currencyCode}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Account</label>
              <Select selectedKey={accountId} onSelectionChange={(k) => setAccountId(k as string)} aria-label="Account" fullWidth>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>{accounts.map((a) => <ListBoxItem key={a.id} id={a.id}>{a.name}</ListBoxItem>)}</ListBox></Select.Popover>
              </Select>
            </div>

            {recordType === "transfer" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">To Account</label>
                <Select selectedKey={toAccountId} onSelectionChange={(k) => setToAccountId(k as string)} aria-label="To Account" fullWidth>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover><ListBox>{accounts.filter((a) => a.id !== accountId).map((a) => <ListBoxItem key={a.id} id={a.id}>{a.name}</ListBoxItem>)}</ListBox></Select.Popover>
                </Select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Category</label>
              <CategorySelect categories={filteredCategories} value={categoryId} onChange={setCategoryId} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Date &amp; Time</label>
              <DatePicker granularity="minute" value={recordDate} onChange={(v) => { if (v) setRecordDate(v); }} aria-label="Date & Time" className="w-full">
                <DateField.Group fullWidth>
                  <DatePicker.Trigger aria-label="Open calendar" className="pl-3">
                    <DatePicker.TriggerIndicator />
                  </DatePicker.Trigger>
                  <DateField.Input>
                    {(segment) => segment.type === "timeZoneName" ? <span /> : <DateField.Segment segment={segment} />}
                  </DateField.Input>
                </DateField.Group>
                <DatePicker.Popover>
                  <Calendar>
                    <Calendar.Header>
                      <Calendar.NavButton slot="previous" />
                      <Calendar.Heading />
                      <Calendar.NavButton slot="next" />
                    </Calendar.Header>
                    <Calendar.Grid>
                      <Calendar.GridHeader>
                        {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                      </Calendar.GridHeader>
                      <Calendar.GridBody>
                        {(date) => <Calendar.Cell date={date} />}
                      </Calendar.GridBody>
                    </Calendar.Grid>
                  </Calendar>
                </DatePicker.Popover>
              </DatePicker>
              <div className="flex gap-2 mt-2">
                {[
                  { label: "Today", date: today(getLocalTimeZone()) },
                  { label: "Yesterday", date: today(getLocalTimeZone()).subtract({ days: 1 }) },
                ].map(({ label, date }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setRecordDate(recordDate.set({ year: date.year, month: date.month, day: date.day }))}
                    className="text-xs px-2.5 py-1 rounded-lg border border-border bg-background text-muted hover:text-foreground hover:bg-default transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:w-72 space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-foreground shrink-0">Other details</p>
              <Separator className="flex-1" />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Note</label>
              <TextArea
                placeholder="Describe your record"
                value={note}
                onChange={(e) => { setNote(e.target.value); setShowSuggestions(true); }}
                onFocus={() => note.trim() && setShowSuggestions(true)}
                onBlur={handleNoteBlur}
                fullWidth
                aria-label="Note"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && suggestions.length > 0}
                rows={3}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div onMouseDown={handleSuggestionMouseDown} className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
                  {suggestions.map((r) => {
                    const label = r.note ?? r.counterParty ?? "—";
                    const positive = r.amount.value > 0;
                    return (
                      <div key={r.id} className="flex items-center hover:bg-default transition-colors">
                        <button type="button" onClick={() => applySuggestion(r)} className="flex-1 flex items-center justify-between gap-3 px-3 py-2.5 text-left min-w-0">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{label}</p>
                            <p className="text-xs text-muted truncate">
                              {r.accountName}{r.category ? ` · ${r.category.name}` : ""}{r.counterParty && r.note ? ` · ${r.counterParty}` : ""}
                            </p>
                          </div>
                          <span className={`text-sm font-mono font-semibold shrink-0 ${positive ? "text-success" : "text-danger"}`}>
                            {positive ? "+" : ""}{fmt(r.amount.value, r.amount.currencyCode)}
                          </span>
                        </button>
                        <button type="button" onClick={() => onGoToRecord(r.id)} title="Go to this record" className="px-3 py-2.5 text-muted hover:text-foreground transition-colors shrink-0 border-l border-border">
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <label className="block text-xs font-semibold text-foreground mb-1.5">Payer</label>
              <Input value={payer} onChange={(e) => setPayer(e.target.value)} fullWidth aria-label="Payer" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Payment type</label>
              <Select selectedKey={paymentType} onSelectionChange={(k) => setPaymentType(k as string)} aria-label="Payment type" fullWidth>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>{PAYMENT_TYPES.map((t) => <ListBoxItem key={t.id} id={t.id}>{t.label}</ListBoxItem>)}</ListBox></Select.Popover>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Payment status</label>
              <Select selectedKey={recordState} onSelectionChange={(k) => setRecordState(k as string)} aria-label="Payment status" fullWidth>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>{RECORD_STATES.map((s) => <ListBoxItem key={s.id} id={s.id}>{s.label}</ListBoxItem>)}</ListBox></Select.Popover>
              </Select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
            {error}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="flex flex-col gap-2 w-full">
          <Button variant="primary" fullWidth onPress={() => submit(false)} isDisabled={amount === undefined || !accountId || submitting}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" /> Saving…
              </span>
            ) : (
              mode === "edit" ? "Save changes" : "Add record"
            )}
          </Button>
          {mode === "add" && (
            <Button variant="outline" fullWidth onPress={() => submit(true)} isDisabled={amount === undefined || !accountId || submitting}>
              Add and create another
            </Button>
          )}
        </div>
      </Modal.Footer>
    </>
  );
}
