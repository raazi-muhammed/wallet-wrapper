"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalTemplate } from "@/templates/modal-template";
import { patchAccounts } from "../actions";
import type { Account, WalletColor } from "../actions";
import type { PatchAccountItem } from "@/lib/wallet-client";
import { ColorPicker, ErrorBox, FieldLabel, ToggleRow, unwrap } from "./EditControls";
import { useDashboard } from "./DashboardProvider";

/** Account fields the API accepts on PATCH. Type and currency are fixed at creation. */
export function AccountForm({ account, onDone, onCancel }: {
  account: Account;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { token, invalidateAll } = useDashboard();
  const [name, setName] = useState(account.name);
  const [color, setColor] = useState<WalletColor | undefined>();
  const [archived, setArchived] = useState(account.archived);
  const [excludeFromStats, setExcludeFromStats] = useState(account.excludeFromStats);
  // The API may return a masked number, which it rejects on write, so the field
  // starts empty and is only sent when the user types a new value or clears it.
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [clearBankNumber, setClearBankNumber] = useState(false);
  const [initialBalance, setInitialBalance] = useState(String(account.balance.initial));

  const { mutate: save, isPending, error } = useMutation({
    mutationFn: async () => {
      const patch: PatchAccountItem = { id: account.id };
      if (name.trim() && name.trim() !== account.name) patch.name = name.trim();
      if (color) patch.color = color;
      if (archived !== account.archived) patch.archived = archived;
      if (excludeFromStats !== account.excludeFromStats) patch.excludeFromStats = excludeFromStats;
      if (clearBankNumber) patch.bankAccountNumber = "";
      else if (bankAccountNumber.trim()) patch.bankAccountNumber = bankAccountNumber.trim();
      const balance = Number(initialBalance);
      if (initialBalance.trim() !== "" && Number.isFinite(balance) && balance !== account.balance.initial) patch.initialBalance = balance;
      if (Object.keys(patch).length > 1) unwrap(await patchAccounts(token, [patch]));
    },
    onSuccess: () => { invalidateAll(); onDone(); },
  });

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Name</FieldLabel>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="rounded-lg" />
      </div>

      <div>
        <FieldLabel>Colour</FieldLabel>
        <ColorPicker value={color} currentHex={account.color} onChange={setColor} />
      </div>

      <div>
        <FieldLabel>Initial balance ({account.balance.currencyCode})</FieldLabel>
        <Input
          type="number"
          step="0.01"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          className="rounded-lg"
        />
      </div>

      <div>
        <FieldLabel>Bank account number / IBAN</FieldLabel>
        <Input
          value={bankAccountNumber}
          onChange={(e) => { setBankAccountNumber(e.target.value); setClearBankNumber(false); }}
          maxLength={80}
          placeholder={account.bankAccountNumber ? `Current: ${account.bankAccountNumber}` : "Not set"}
          className="rounded-lg"
          disabled={clearBankNumber}
        />
        {account.bankAccountNumber && (
          <button
            type="button"
            onClick={() => { setClearBankNumber((v) => !v); setBankAccountNumber(""); }}
            className="text-xs text-muted hover:text-foreground mt-1 pl-3"
          >
            {clearBankNumber ? "Keep current number" : "Remove number"}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <ToggleRow
          label="Exclude from statistics"
          checked={excludeFromStats}
          onChange={setExcludeFromStats}
        />
        <ToggleRow
          label="Archived"
          description="Hidden from the sidebar and account pickers"
          checked={archived}
          onChange={setArchived}
        />
      </div>

      <p className="text-xs text-muted pl-3">
        Type ({account.accountType.replace(/([A-Z])/g, " $1").trim()}) and currency ({account.balance.currencyCode}) can&apos;t be changed after creation.
      </p>

      <ErrorBox error={error} />

      <div className="grid grid-cols-2 gap-2">
        <Button variant="card" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => save()} disabled={isPending || !name.trim()}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

export function AccountEditModal({ account, isOpen, onClose }: {
  account: Account;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <ModalTemplate
      open={isOpen}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title="Edit account"
      bodyClassName="px-4 sm:px-6 pb-5"
    >
      <AccountForm account={account} onDone={onClose} onCancel={onClose} />
    </ModalTemplate>
  );
}
