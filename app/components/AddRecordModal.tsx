"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ModalTemplate } from "@/templates/modal-template";
import type { Account, WalletRecord } from "../actions";
import { getCategoryIcon, getAccountIcon } from "@/lib/utils";

// RecordForm pulls in the category/account pickers, the date-time picker
// (react-day-picker) and its own note/payer-suggestion queries — none of
// that is needed until someone actually opens the add/edit dialog, so it's
// loaded as a separate chunk on first open rather than bundled into every
// records page.
const RecordForm = dynamic(() => import("./RecordForm"), {
  loading: () => <RecordFormSkeleton />,
});

function RecordFormSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 items-center justify-center py-16">
      <HugeiconsIcon icon={Loading03Icon} className="size-5 text-muted animate-spin" />
    </div>
  );
}

export const PAYMENT_TYPES: { id: string; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "debit_card", label: "Debit Card" },
  { id: "credit_card", label: "Credit Card" },
  { id: "transfer", label: "Transfer" },
  { id: "voucher", label: "Voucher" },
  { id: "mobile_payment", label: "Mobile Payment" },
  { id: "web_payment", label: "Web Payment" },
];
export const RECORD_STATES: { id: string; label: string }[] = [
  { id: "cleared", label: "Cleared" },
  { id: "uncleared", label: "Uncleared" },
  { id: "reconciled", label: "Reconciled" },
];

export function fmt(value: number, currency: string) {
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
  defaultAccountId?: string;
  onSuccess: () => void;
  onGoToRecord: (id: string) => void;
  onOpenRecord: (record: WalletRecord) => void;
}

export function AddRecordButton({ token, accounts, defaultAccountId, onSuccess, onOpenRecord }: AddProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!token}>
        + Add Record
      </Button>
      <ModalTemplate
        open={open}
        onOpenChange={setOpen}
        title="Add record"
        className="max-w-[720px] max-h-[90vh] flex flex-col gap-0"
        bodyClassName="flex flex-col flex-1 min-h-0 p-0"
      >
        <RecordForm
          mode="add"
          token={token}
          accounts={accounts}
          defaultAccountId={defaultAccountId}
          onSuccess={() => { setOpen(false); onSuccess(); }}
          onOpenRecord={(rec) => { setOpen(false); onOpenRecord(rec); }}
        />
      </ModalTemplate>
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
  const accountIcon = getAccountIcon(account?.accountType ?? "", record.accountName);
  const accountColor = account?.color ?? "var(--muted-foreground)";
  const categoryIcon = getCategoryIcon(record.category?.name ?? "", record.category?.group?.name);

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
    <ModalTemplate
      open={isOpen}
      onOpenChange={(o) => { if (!o) onClose(); }}
      className="max-w-sm gap-4"
      bodyClassName="px-4 sm:px-6 pt-0 pb-0 space-y-0"
      title="Record Details"
    >
      <div className="space-y-3.5">
        <p className={`text-3xl font-bold tabular-nums ${positive ? "text-success" : "text-danger"}`}>
          {positive ? "+" : ""}{fmt(record.amount.value, record.amount.currencyCode)}
        </p>

        <DetailRow label="Type">
          <span className="text-sm">{typeLabel}</span>
        </DetailRow>

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
        <div className="pb-5">
          <button
            onClick={() => { onClose(); onDuplicate(); }}
            className="w-full py-2 rounded-lg border border-border text-sm font-medium text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Duplicate record
          </button>
        </div>
      )}
    </ModalTemplate>
  );
}

export function DuplicateRecordModal({ record, token, accounts, isOpen, onClose, onSuccess, onOpenRecord }: {
  record: WalletRecord;
  token: string;
  accounts: Account[];
  records: WalletRecord[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onGoToRecord: (id: string) => void;
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
        token={token}
        accounts={accounts}
        defaultAccountId={record.accountId}
        onSuccess={() => { onClose(); onSuccess(); }}
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
