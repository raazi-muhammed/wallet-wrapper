"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { fetchAccounts } from "../actions";
import type { Account } from "../actions";
import { getAccountIcon } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenConnectForm } from "./TokenConnectForm";
import { useDashboard } from "./DashboardProvider";

function fmt(amount: number | undefined, currency: string | undefined) {
  if (amount == null || !currency) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function CreditUsageBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-success";
  return (
    <div className="h-1.5 rounded-full bg-default overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function InsightsView({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const creditCards = accounts.filter((a) => a.accountType === "CreditCard");
  const currentAccounts = accounts.filter((a) => a.accountType === "CurrentAccount");

  const totalUsed = creditCards.reduce((s, a) => s + Math.abs(Math.min(a.balance.currentBalance, 0)), 0);
  const totalLimit = creditCards.reduce((s, a) => s + (a.balance.creditLimit ?? 0), 0);
  const totalPct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  const currentAccountsTotal = currentAccounts.reduce((s, a) => s + a.balance.currentBalance, 0);

  return (
    <div className="px-6 py-6 space-y-6">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <button
          onClick={() => router.push("/")}
          aria-label="Back"
          className="md:hidden flex items-center justify-center size-6 -ml-1.5 rounded-full text-muted hover:text-foreground hover:bg-default transition-colors shrink-0"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        </button>
        Insights
      </h2>

      {/* Credit Cards section */}
      {creditCards.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Credit Cards</p>

          {creditCards.map((a) => {
            const used = Math.abs(Math.min(a.balance.currentBalance, 0));
            const limit = a.balance.creditLimit ?? 0;
            const pct = limit > 0 ? (used / limit) * 100 : 0;
            const icon = getAccountIcon(a.accountType, a.name);
            const pctColor = pct >= 90 ? "text-danger" : pct >= 70 ? "text-warning" : "text-success";

            return (
              <div key={a.id} className="rounded-xl p-4 space-y-3 bg-card">
                <div className="flex items-center gap-2.5">
                  <HugeiconsIcon icon={icon} className="size-4 shrink-0" style={{ color: a.color ?? "var(--muted-foreground)" }} />
                  <span className="text-sm font-medium text-foreground">{a.name}</span>
                </div>
                <CreditUsageBar pct={pct} />
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="text-muted">Used</p>
                    <p className="font-semibold text-foreground tabular-nums">{fmt(used, a.balance.currencyCode)}</p>
                  </div>
                  <div className="space-y-0.5 text-center">
                    <p className="text-muted">Usage</p>
                    <p className={`font-semibold tabular-nums ${pctColor}`}>{pct.toFixed(1)}%</p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <p className="text-muted">Limit</p>
                    <p className="font-semibold text-foreground tabular-nums">{limit > 0 ? fmt(limit, a.balance.currencyCode) : "—"}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {creditCards.length > 1 && (
            <div className="rounded-xl p-4 space-y-3 border border-border bg-card-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest">Total</p>
              <CreditUsageBar pct={totalPct} />
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <p className="text-muted">Used</p>
                  <p className="font-semibold text-foreground tabular-nums">{fmt(totalUsed, creditCards[0].balance.currencyCode)}</p>
                </div>
                <div className="space-y-0.5 text-center">
                  <p className="text-muted">Usage</p>
                  <p className={`font-semibold tabular-nums ${totalPct >= 90 ? "text-danger" : totalPct >= 70 ? "text-warning" : "text-success"}`}>
                    {totalPct.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-muted">Limit</p>
                  <p className="font-semibold text-foreground tabular-nums">{totalLimit > 0 ? fmt(totalLimit, creditCards[0].balance.currencyCode) : "—"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Accounts section */}
      {currentAccounts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Current Accounts</p>

          {currentAccounts.map((a) => {
            const icon = getAccountIcon(a.accountType, a.name);
            const bal = a.balance.currentBalance;
            return (
              <div key={a.id} className="rounded-xl p-4 flex items-center justify-between bg-card">
                <div className="flex items-center gap-2.5">
                  <HugeiconsIcon icon={icon} className="size-4 shrink-0" style={{ color: a.color ?? "var(--muted-foreground)" }} />
                  <span className="text-sm font-medium text-foreground">{a.name}</span>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${bal < 0 ? "text-danger" : "text-foreground"}`}>
                  {fmt(bal, a.balance.currencyCode)}
                </span>
              </div>
            );
          })}

          {currentAccounts.length > 1 && (
            <div className="rounded-xl p-4 flex items-center justify-between border border-border bg-card-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-widest">Total</span>
              <span className={`text-sm font-semibold tabular-nums ${currentAccountsTotal < 0 ? "text-danger" : "text-foreground"}`}>
                {fmt(currentAccountsTotal, currentAccounts[0].balance.currencyCode)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InsightsPageView() {
  const { token, handleSave } = useDashboard();

  const { data: accounts = [], isLoading: accountsLoading, isError: accountsError } = useQuery({
    queryKey: ["accounts", token],
    queryFn: () => fetchAccounts(token),
    enabled: !!token,
  });

  const activeAccounts = accounts.filter((a) => !a.archived);
  const initialLoading = !!token && accountsLoading && activeAccounts.length === 0;

  if (!token) {
    return <TokenConnectForm onSave={handleSave} />;
  }

  if (initialLoading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (accountsError && activeAccounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <HugeiconsIcon icon={AlertCircleIcon} className="size-8 text-danger" />
        <p className="text-foreground font-medium">Couldn&apos;t load your accounts</p>
        <p className="text-muted text-sm">Your token may be invalid or expired. Check it in Settings.</p>
      </div>
    );
  }

  return <InsightsView accounts={activeAccounts} />;
}
