"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CircleDashedIcon } from "@hugeicons/core-free-icons";

export function TokenConnectForm({ onSave }: { onSave: (t: string) => void }) {
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <HugeiconsIcon icon={CircleDashedIcon} className="size-10 text-muted" />
        <p className="text-foreground font-medium">Connect your Wallet</p>
        <p className="text-muted text-sm">Paste your Bearer token below to get started.</p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && draft && onSave(draft)}
          placeholder="Paste your Bearer token…"
          autoFocus
          className="w-full rounded-lg border border-border bg-background text-foreground placeholder:text-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={() => onSave(draft)}
          disabled={!draft}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          Connect
        </button>
      </div>
    </div>
  );
}
