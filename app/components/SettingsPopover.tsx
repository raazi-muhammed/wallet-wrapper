"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import type { ApiStats } from "../actions";
import type { Period } from "@/hooks/use-wallet-data";
import { Button } from "@/components/ui/button";
import { ModalTemplate } from "@/templates/modal-template";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Settings Popover ──────────────────────────────────────────────────────────

export function SettingsPopover({
  connected,
  maskedToken,
  stats,
  period,
  setPeriod,
  onSave,
  onDisconnect,
}: {
  connected: boolean;
  maskedToken: string;
  stats: ApiStats | null;
  period: Period;
  setPeriod: (p: Period) => void;
  onSave: (t: string) => void;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { theme, setTheme } = useTheme();

  const used = stats ? stats.rateLimit - stats.rateLimitRemaining : null;
  const pct = stats ? Math.round((used! / stats.rateLimit) * 100) : null;

  function handleSaveAndClose(t: string) {
    onSave(t);
    setDraft("");
    setOpen(false);
  }

  function handleDisconnectAndClose() {
    onDisconnect();
    setOpen(false);
  }

  return (
    <ModalTemplate
      open={open}
      onOpenChange={setOpen}
      title="Settings"
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          className="rounded-full text-muted hover:bg-secondary dark:hover:bg-secondary aria-expanded:bg-secondary focus-visible:border-transparent focus-visible:ring-0"
        >
          <HugeiconsIcon icon={Settings01Icon} className="size-4" />
        </Button>
      }
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted pl-4">API Connection</p>
        <div className="rounded-xl bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm">
              <span className={`size-2 rounded-full ${connected ? "bg-success" : "bg-muted"}`} />
              <span className="text-foreground font-medium">{connected ? "Connected" : "Not connected"}</span>
            </div>
            {connected && (
              <button
                onClick={handleDisconnectAndClose}
                className="px-3 py-1 rounded-lg border border-border text-xs font-medium text-muted hover:text-danger hover:border-danger transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>

          {connected ? (
            <p className="font-mono text-xs text-muted">{maskedToken}</p>
          ) : (
            <>
              <input
                type="password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && draft && handleSaveAndClose(draft)}
                placeholder="Paste your bearer token…"
                className="w-full rounded-lg border border-border bg-background text-foreground placeholder:text-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                onClick={() => handleSaveAndClose(draft)}
                disabled={!draft}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                Connect
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted pl-4">Period</p>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-full rounded-xl bg-card border-0 px-4 py-3 h-auto text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">3 Months</SelectItem>
            <SelectItem value="6m">6 Months</SelectItem>
            <SelectItem value="1y">1 Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted pl-4">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: "system", label: "System" },
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
          ] as const).map((t) => {
            const selected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`relative w-full aspect-video rounded-xl overflow-hidden border-2 transition-colors ${
                    selected ? "border-primary" : "border-border"
                  }`}
                >
                  {t.id === "system" ? (
                    <div className="absolute inset-0 flex">
                      <div className="flex-1 flex items-center justify-center" style={{ background: "#0a0a0a" }}>
                        <span className="px-2 py-0.5 rounded-full border border-white/30 text-white text-[9px] font-semibold">Aa</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center" style={{ background: "#e8e8e8" }}>
                        <span className="px-2 py-0.5 rounded-full bg-white text-black text-[9px] font-semibold shadow-sm">Aa</span>
                      </div>
                    </div>
                  ) : t.id === "light" ? (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#e8e8e8" }}>
                      <span className="px-2 py-0.5 rounded-full bg-white text-black text-[9px] font-semibold shadow-sm">Aa</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0a0a0a" }}>
                      <span className="px-2 py-0.5 rounded-full border border-white/30 text-white text-[9px] font-semibold">Aa</span>
                    </div>
                  )}
                  {selected && (
                    <div className="absolute bottom-1 right-1 size-4 rounded-full bg-primary flex items-center justify-center">
                      <HugeiconsIcon icon={Tick02Icon} className="size-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <span className={`text-xs ${selected ? "text-foreground font-medium" : "text-muted"}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {stats && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted pl-4">API Usage Stats</p>
          <div className="rounded-xl overflow-hidden bg-card">
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-xs text-muted">
                <span>Rate limit</span>
                <span className="font-mono text-foreground">{used} / {stats.rateLimit} req/hr</span>
              </div>
              <div className="h-1.5 rounded-full bg-default overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct! > 80 ? "bg-danger" : "bg-success"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 text-sm border-t border-separator">
              <span className="text-muted">Last change</span>
              <span className="text-foreground font-medium">
                {stats.lastDataChangeAt ? fmtRelative(stats.lastDataChangeAt) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-sm border-t border-separator">
              <span className="text-muted">Revision</span>
              <span className="text-foreground font-medium font-mono">{stats.lastDataChangeRev ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-sm border-t border-separator">
              <span className="text-muted">Sync status</span>
              <span className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${stats.syncInProgress ? "bg-warning animate-pulse" : "bg-success"}`} />
                <span className="text-foreground font-medium">{stats.syncInProgress ? "Syncing…" : "Up to date"}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </ModalTemplate>
  );
}
