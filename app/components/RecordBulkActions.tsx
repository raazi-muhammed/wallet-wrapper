"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ModalTemplate } from "@/templates/modal-template";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { patchRecords, deleteRecords } from "../actions";
import type { Account, WalletRecord } from "../actions";
import type { PatchRecordItem } from "@/lib/wallet-client";
import { useCategories, useLabels, useCreateLabel } from "@/hooks/use-wallet-data";
import { AccountSelect, CategorySelect, RECORD_STATES, recordDeleteGroup } from "./AddRecordModal";
import { ErrorBox, FieldLabel, LabelSelect, unwrap } from "./EditControls";

type EditableState = (typeof RECORD_STATES)[number]["id"];

// ── Bulk edit modal ───────────────────────────────────────────────────────────

function BulkEditModal({ token, records, accounts, isOpen, onClose, onSuccess }: {
  token: string;
  records: WalletRecord[];
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: categories = [] } = useCategories(token);
  const { data: labels = [] } = useLabels(token);
  const [categoryId, setCategoryId] = useState("");
  const [addLabelIds, setAddLabelIds] = useState<string[]>([]);
  const [removeLabelIds, setRemoveLabelIds] = useState<string[]>([]);
  const [recordState, setRecordState] = useState<EditableState | "">("");
  const [accountId, setAccountId] = useState("");
  const createLabel = useCreateLabel(token, (id) => setAddLabelIds((ids) => [...ids, id]));

  // Moves are only allowed off non-bank-synced accounts, into one with the same currency.
  const target = accounts.find((a) => a.id === accountId);
  const currencyOf = (id: string) => accounts.find((a) => a.id === id)?.balance.currencyCode;
  const movable = (r: WalletRecord) =>
    !r.accountIsBankSync && r.accountId !== accountId && currencyOf(r.accountId) === target?.balance.currencyCode;
  const moveTargets = accounts.filter((a) => !a.isBankSync && !a.archived);
  // Paired transfers keep their status in sync with the mirror, so the API rejects state edits on them.
  const stateEditable = (r: WalletRecord) => !r.transfer?.paired;

  const skippedMoves = accountId ? records.filter((r) => !movable(r) && r.accountId !== accountId).length : 0;
  const skippedStates = recordState ? records.filter((r) => !stateEditable(r)).length : 0;

  const { mutate: apply, isPending, error, reset } = useMutation({
    mutationFn: async () => {
      const patches: PatchRecordItem[] = [];
      for (const r of records) {
        const patch: PatchRecordItem = { id: r.id };
        if (categoryId) patch.categoryId = categoryId;
        if (addLabelIds.length > 0 || removeLabelIds.length > 0) {
          patch.labelIds = {
            ...(addLabelIds.length > 0 ? { add: addLabelIds } : {}),
            ...(removeLabelIds.length > 0 ? { remove: removeLabelIds } : {}),
          };
        }
        if (recordState && stateEditable(r) && r.recordState !== recordState) patch.recordState = recordState;
        if (accountId && movable(r)) patch.accountId = accountId;
        if (Object.keys(patch).length > 1) patches.push(patch);
      }
      if (patches.length > 0) unwrap(await patchRecords(token, patches));
    },
    onSuccess: () => { onClose(); onSuccess(); },
  });

  const nothingChosen = !categoryId && addLabelIds.length === 0 && removeLabelIds.length === 0 && !recordState && !accountId;

  return (
    <ModalTemplate
      open={isOpen}
      onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}
      title={`Edit ${records.length} record${records.length === 1 ? "" : "s"}`}
      bodyClassName="px-4 sm:px-6 pb-5 space-y-4"
    >
      <p className="text-xs text-muted pl-3">Only the fields you set are changed. Everything else stays as it is.</p>

      <div>
        <FieldLabel>Set category</FieldLabel>
        <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
      </div>

      <div>
        <FieldLabel>Add labels</FieldLabel>
        <LabelSelect labels={labels} value={addLabelIds} onChange={setAddLabelIds} onCreate={createLabel} />
      </div>

      <div>
        <FieldLabel>Remove labels</FieldLabel>
        <LabelSelect labels={labels} value={removeLabelIds} onChange={setRemoveLabelIds} placeholder="Remove labels" />
      </div>

      <div>
        <FieldLabel>Set status</FieldLabel>
        <Select value={recordState || "keep"} onValueChange={(v) => setRecordState(v === "keep" ? "" : v as EditableState)}>
          <SelectTrigger className="w-full rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="keep">No change</SelectItem>
            {RECORD_STATES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {skippedStates > 0 && <p className="text-xs text-muted mt-1 pl-3">{skippedStates} paired transfer{skippedStates === 1 ? "" : "s"} will keep their status.</p>}
      </div>

      <div>
        <FieldLabel>Move to account</FieldLabel>
        <AccountSelect accounts={moveTargets} value={accountId} onChange={setAccountId} placeholder="Keep current account" />
        {skippedMoves > 0 && (
          <p className="text-xs text-muted mt-1 pl-3">
            {skippedMoves} record{skippedMoves === 1 ? "" : "s"} can&apos;t move (bank-synced account or different currency) and will stay put.
          </p>
        )}
      </div>

      <ErrorBox error={error} />

      <div className="grid grid-cols-2 gap-2">
        <Button variant="card" onClick={onClose}>Cancel</Button>
        <Button onClick={() => apply()} disabled={nothingChosen || isPending}>
          {isPending ? "Saving…" : "Apply"}
        </Button>
      </div>
    </ModalTemplate>
  );
}

// ── Selection bar ─────────────────────────────────────────────────────────────

export function BulkActionBar({ token, selected, accounts, onSelectAll, onClear, onDone }: {
  token: string;
  selected: WalletRecord[];
  accounts: Account[];
  onSelectAll: () => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { mutate: runDelete, isPending: deleting, error: deleteError, reset } = useMutation({
    mutationFn: async () => {
      // A selected transfer leg pulls in its mirror; dedupe in case both legs were picked.
      const seen = new Set<string>();
      const groups = selected.map(recordDeleteGroup).filter((g) => {
        if (g.some((id) => seen.has(id))) return false;
        g.forEach((id) => seen.add(id));
        return true;
      });
      unwrap(await deleteRecords(token, groups));
    },
    onSuccess: () => { setConfirmingDelete(false); onDone(); },
  });

  const count = selected.length;

  return (
    <div className="sticky bottom-4 z-20 rounded-xl bg-card shadow-lg border border-border px-3 py-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground pl-1 mr-auto">{count} selected</span>
        <Button size="sm" variant="ghost" onClick={onSelectAll}>Select all</Button>
        <Button size="sm" variant="ghost" onClick={onClear}>Done</Button>
        {confirmingDelete ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => { reset(); setConfirmingDelete(false); }} disabled={deleting}>Keep</Button>
            <Button size="sm" variant="destructive" onClick={() => runDelete()} disabled={deleting}>
              {deleting ? "Deleting…" : `Delete ${count}`}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="destructive" onClick={() => setConfirmingDelete(true)} disabled={count === 0}>Delete</Button>
        )}
        <Button size="sm" onClick={() => setEditing(true)} disabled={count === 0}>Edit</Button>
      </div>
      {confirmingDelete && selected.some((r) => r.transfer?.paired) && (
        <p className="text-xs text-muted pl-1">Paired transfers are deleted together with their linked record.</p>
      )}
      <ErrorBox error={deleteError} />
      {editing && (
        <BulkEditModal
          token={token}
          records={selected}
          accounts={accounts}
          isOpen={editing}
          onClose={() => setEditing(false)}
          onSuccess={onDone}
        />
      )}
    </div>
  );
}
