import type { WalletRecord } from "@/lib/wallet-client";

export type EditableState = "cleared" | "uncleared" | "reconciled";

export const RECORD_STATES: { id: EditableState; label: string }[] = [
  { id: "cleared", label: "Cleared" },
  { id: "uncleared", label: "Uncleared" },
  { id: "reconciled", label: "Reconciled" },
];

/** The ids to delete for a record: a paired transfer goes together with its mirror. */
export function recordDeleteGroup(record: WalletRecord) {
  return record.transfer?.mirrorId ? [record.id, record.transfer.mirrorId] : [record.id];
}
