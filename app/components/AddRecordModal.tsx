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
} from "@heroui/react";
import { fetchCategories } from "../actions";
import type { Account, Category, WalletRecord } from "../actions";

type RecordType = "expense" | "income" | "transfer";

const PAYMENT_TYPES = ["Cash", "CreditCard", "DebitCard", "BankTransfer", "Voucher", "MobilePayment", "Other"];
const RECORD_STATES = ["Cleared", "Uncleared", "Reconciled"];

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
  const [amount, setAmount] = useState(() => initialRecord ? Math.abs(initialRecord.amount.value).toString() : "");
  const [accountId, setAccountId] = useState(() => initialRecord?.accountId ?? accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState(() => initialRecord?.category?.id ?? "");
  const [note, setNote] = useState(() => initialRecord?.note ?? "");
  const [payer, setPayer] = useState(() => initialRecord?.counterParty ?? "");
  const [paymentType, setPaymentType] = useState(() => initialRecord?.paymentType ?? "Cash");
  const [recordState, setRecordState] = useState(() => initialRecord?.recordState ?? "Cleared");
  const [recordDate, setRecordDate] = useState(() => {
    if (initialRecord) return new Date(initialRecord.recordDate).toISOString().slice(0, 16);
    return new Date().toISOString().slice(0, 16);
  });

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
      const label = (r.note ?? r.counterParty ?? "").toLowerCase();
      if (!label.includes(q)) continue;
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
    setAmount(Math.abs(r.amount.value).toString());
    setAccountId(r.accountId);
    if (r.category?.id) setCategoryId(r.category.id);
    const rt = deriveType(r);
    setRecordType(rt);
    setPaymentType(r.paymentType ?? "Cash");
    if (r.recordState) setRecordState(r.recordState);
    setShowSuggestions(false);
  }

  function handleNoteChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNote(e.target.value);
    setShowSuggestions(true);
  }

  function handleNoteBlur() {
    blurTimer.current = setTimeout(() => setShowSuggestions(false), 150);
  }

  function handleSuggestionMouseDown() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }

  async function submit(addAnother: boolean) {
    if (!amount || !accountId) return;
    setSubmitting(true);
    setError("");

    const numAmount = parseFloat(amount);
    const signedAmount = recordType === "expense" ? -Math.abs(numAmount) : Math.abs(numAmount);

    const payload: Record<string, unknown> = {
      accountId,
      note: note || undefined,
      counterParty: payer || undefined,
      amount: { value: signedAmount, currencyCode },
      recordDate: new Date(recordDate).toISOString(),
      paymentType,
      recordType,
      recordState,
    };
    if (categoryId) payload.category = { id: categoryId };
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
        setAmount(""); setNote(""); setPayer(""); setCategoryId("");
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
            <div className="flex rounded-xl overflow-hidden border border-border">
              {(["expense", "income", "transfer"] as RecordType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setRecordType(t)}
                  className={`flex-1 py-2 text-sm font-semibold capitalize transition-colors ${
                    recordType === t
                      ? t === "expense" ? "bg-danger text-white" : "bg-success text-white"
                      : "bg-background text-muted hover:bg-default"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Amount <span className="text-danger">*</span></label>
              <div className="flex gap-2">
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1" aria-label="Amount" />
                <div className="w-24">
                  <Select selectedKey={currencyCode} aria-label="Currency">
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover><ListBox><ListBoxItem id={currencyCode}>{currencyCode}</ListBoxItem></ListBox></Select.Popover>
                  </Select>
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
              <label className="block text-xs font-semibold text-foreground mb-1.5">Category <span className="text-danger">*</span></label>
              <Select selectedKey={categoryId || null} onSelectionChange={(k) => setCategoryId(k as string)} aria-label="Category" fullWidth>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>{filteredCategories.map((c) => <ListBoxItem key={c.id} id={c.id}>{c.name}</ListBoxItem>)}</ListBox></Select.Popover>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Date &amp; Time</label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input type="datetime-local" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className="flex-1 bg-transparent text-sm text-foreground focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:w-72 space-y-4">
            <p className="text-sm font-semibold text-foreground">Other details</p>

            <div className="relative">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Note</label>
              <Input
                placeholder="Describe your record"
                value={note}
                onChange={handleNoteChange}
                onFocus={() => note.trim() && setShowSuggestions(true)}
                onBlur={handleNoteBlur}
                fullWidth
                aria-label="Note"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && suggestions.length > 0}
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
                <Select.Popover><ListBox>{PAYMENT_TYPES.map((t) => <ListBoxItem key={t} id={t}>{t.replace(/([A-Z])/g, " $1").trim()}</ListBoxItem>)}</ListBox></Select.Popover>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Payment status</label>
              <Select selectedKey={recordState} onSelectionChange={(k) => setRecordState(k as string)} aria-label="Payment status" fullWidth>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>{RECORD_STATES.map((s) => <ListBoxItem key={s} id={s}>{s}</ListBoxItem>)}</ListBox></Select.Popover>
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
          <Button variant="primary" fullWidth onPress={() => submit(false)} isDisabled={!amount || !accountId || submitting}>
            {submitting ? "Saving…" : mode === "edit" ? "Save changes" : "Add record"}
          </Button>
          {mode === "add" && (
            <Button variant="outline" fullWidth onPress={() => submit(true)} isDisabled={!amount || !accountId || submitting}>
              Add and create another
            </Button>
          )}
        </div>
      </Modal.Footer>
    </>
  );
}
