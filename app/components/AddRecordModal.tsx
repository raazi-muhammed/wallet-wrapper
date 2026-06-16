"use client";

import { useState, useEffect } from "react";
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
import type { Account, Category } from "../actions";

type RecordType = "expense" | "income" | "transfer";

const PAYMENT_TYPES = ["Cash", "CreditCard", "DebitCard", "BankTransfer", "Voucher", "MobilePayment", "Other"];
const RECORD_STATES = ["Cleared", "Uncleared", "Reconciled"];

interface Props {
  token: string;
  accounts: Account[];
  onSuccess: () => void;
}

export function AddRecordButton({ token, accounts, onSuccess }: Props) {
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
              <AddRecordForm
                token={token}
                accounts={accounts}
                onSuccess={() => { state.close(); onSuccess(); }}
                onCancel={state.close}
              />
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

function AddRecordForm({
  token,
  accounts,
  onSuccess,
  onCancel,
}: {
  token: string;
  accounts: Account[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [recordType, setRecordType] = useState<RecordType>("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [payer, setPayer] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [recordState, setRecordState] = useState("Cleared");
  const [recordDate, setRecordDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const currencyCode = selectedAccount?.balance.currencyCode ?? "INR";

  useEffect(() => {
    if (!token) return;
    fetchCategories(token)
      .then(setCategories)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const filteredCategories = categories.filter((c) => {
    if (recordType === "transfer") return true;
    if (!c.categoryType) return true;
    return c.categoryType.toLowerCase() === recordType;
  });

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

    if (categoryId) payload.categoryId = categoryId;
    if (recordType === "transfer" && toAccountId) payload.toAccountId = toAccountId;

    try {
      const res = await fetch("/api/wallet/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-token": token,
        },
        body: JSON.stringify({ records: [payload] }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? `HTTP ${res.status}`);
      }

      if (addAnother) {
        setAmount("");
        setNote("");
        setPayer("");
        setCategoryId("");
      } else {
        onSuccess();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create record");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal.Header>
        <Modal.Heading>Add record</Modal.Heading>
        <Modal.CloseTrigger />
      </Modal.Header>

      <Modal.Body>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex-1 space-y-4">
            {/* Record type */}
            <div className="flex rounded-xl overflow-hidden border border-border">
              {(["expense", "income", "transfer"] as RecordType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setRecordType(t)}
                  className={`flex-1 py-2 text-sm font-semibold capitalize transition-colors ${
                    recordType === t
                      ? t === "expense"
                        ? "bg-danger text-white"
                        : "bg-success text-white"
                      : "bg-background text-muted hover:bg-default"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Amount <span className="text-danger">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1"
                  aria-label="Amount"
                />
                <div className="w-24">
                  <Select
                    selectedKey={currencyCode}
                    aria-label="Currency"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBoxItem id={currencyCode}>{currencyCode}</ListBoxItem>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </div>
            </div>

            {/* Account */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Account</label>
              <Select
                selectedKey={accountId}
                onSelectionChange={(k) => setAccountId(k as string)}
                aria-label="Account"
                fullWidth
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {accounts.map((a) => (
                      <ListBoxItem key={a.id} id={a.id}>{a.name}</ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* To Account (transfer only) */}
            {recordType === "transfer" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">To Account</label>
                <Select
                  selectedKey={toAccountId}
                  onSelectionChange={(k) => setToAccountId(k as string)}
                  aria-label="To Account"
                  fullWidth
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {accounts.filter((a) => a.id !== accountId).map((a) => (
                        <ListBoxItem key={a.id} id={a.id}>{a.name}</ListBoxItem>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Category <span className="text-danger">*</span>
              </label>
              <Select
                selectedKey={categoryId || null}
                onSelectionChange={(k) => setCategoryId(k as string)}
                aria-label="Category"
                fullWidth
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {filteredCategories.map((c) => (
                      <ListBoxItem key={c.id} id={c.id}>{c.name}</ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Date &amp; Time</label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="datetime-local"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:w-72 space-y-4">
            <p className="text-sm font-semibold text-foreground">Other details</p>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Note</label>
              <Input
                placeholder="Describe your record"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                fullWidth
                aria-label="Note"
              />
            </div>

            {/* Payer */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Payer</label>
              <Input
                placeholder=""
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                fullWidth
                aria-label="Payer"
              />
            </div>

            {/* Payment type */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Payment type</label>
              <Select
                selectedKey={paymentType}
                onSelectionChange={(k) => setPaymentType(k as string)}
                aria-label="Payment type"
                fullWidth
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {PAYMENT_TYPES.map((t) => (
                      <ListBoxItem key={t} id={t}>{t.replace(/([A-Z])/g, " $1").trim()}</ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Payment status */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Payment status</label>
              <Select
                selectedKey={recordState}
                onSelectionChange={(k) => setRecordState(k as string)}
                aria-label="Payment status"
                fullWidth
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {RECORD_STATES.map((s) => (
                      <ListBoxItem key={s} id={s}>{s}</ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
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
          <Button
            variant="primary"
            fullWidth
            onPress={() => submit(false)}
            isDisabled={!amount || !accountId || submitting}
          >
            {submitting ? "Saving…" : "Add record"}
          </Button>
          <Button
            variant="outline"
            fullWidth
            onPress={() => submit(true)}
            isDisabled={!amount || !accountId || submitting}
          >
            Add and create another
          </Button>
        </div>
      </Modal.Footer>
    </>
  );
}
