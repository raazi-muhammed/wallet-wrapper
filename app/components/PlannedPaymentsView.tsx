"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { differenceInCalendarDays, format, parseISO, startOfDay, subDays } from "date-fns";
import type { Account, Category, StandingOrder, StandingOrderItem } from "../actions";
import { ICON_BG_COLORS, hashStr, getAccountIcon, getCategoryIcon } from "@/lib/utils";
import { accountsQuery, standingOrderItemsQuery, standingOrdersQuery, useCategories } from "@/hooks/use-wallet-data";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenConnectForm } from "./TokenConnectForm";
import { useDashboard } from "./DashboardProvider";
import { LabelChip } from "./EditControls";
import { formatMoney } from "@/lib/format";

// Unpaid occurrences older than this are treated as stale rather than overdue.
const OVERDUE_LOOKBACK_DAYS = 90;

// ── Recurrence (RRULE) helpers ────────────────────────────────────────────────

function parseRule(rule: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (rule ?? "").replace(/^RRULE:/i, "").split(";")) {
    const [k, v] = part.split("=");
    if (k && v) out[k.toUpperCase()] = v;
  }
  return out;
}

const FREQ_UNITS: Record<string, [string, string]> = {
  DAILY: ["Daily", "days"],
  WEEKLY: ["Weekly", "weeks"],
  MONTHLY: ["Monthly", "months"],
  YEARLY: ["Yearly", "years"],
};

function describeRule(rule: string | undefined) {
  const { FREQ, INTERVAL } = parseRule(rule);
  const unit = FREQ_UNITS[FREQ ?? ""];
  if (!unit) return "One-time";
  const interval = Number(INTERVAL ?? 1);
  return interval > 1 ? `Every ${interval} ${unit[1]}` : unit[0];
}

/** How many times the order runs per month, on average. 0 for one-time or unknown rules. */
function occurrencesPerMonth(rule: string | undefined) {
  const { FREQ, INTERVAL } = parseRule(rule);
  const interval = Number(INTERVAL ?? 1) || 1;
  const perMonth: Record<string, number> = { DAILY: 30.44, WEEKLY: 30.44 / 7, MONTHLY: 1, YEARLY: 1 / 12 };
  return (perMonth[FREQ ?? ""] ?? 0) / interval;
}

function dueLabel(days: number) {
  if (days < -1) return `${-days} days overdue`;
  if (days === -1) return "Yesterday";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/** Sums amounts per currency and renders them joined, e.g. "₹1,200.00 · $40.00". */
function fmtTotals(entries: { amount: number; currencyCode: string }[]) {
  const byCurrency = new Map<string, number>();
  for (const e of entries) byCurrency.set(e.currencyCode, (byCurrency.get(e.currencyCode) ?? 0) + e.amount);
  if (byCurrency.size === 0) return "—";
  return [...byCurrency].map(([c, v]) => formatMoney(v, c)).join(" · ");
}

// ── Rows ──────────────────────────────────────────────────────────────────────

type Lookups = { accounts: Map<string, Account>; categories: Map<string, Category> };

function PaymentRow({
  order,
  date,
  index,
  isFirst,
  isLast,
  lookups,
  today,
}: {
  order: StandingOrder;
  date?: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  lookups: Lookups;
  today: Date;
}) {
  const category = order.categoryId ? lookups.categories.get(order.categoryId) : undefined;
  const account = order.accountId ? lookups.accounts.get(order.accountId) : undefined;
  const categoryIcon = getCategoryIcon(category?.name ?? order.name, category?.group?.name);
  const iconColor = ICON_BG_COLORS[hashStr(category?.name ?? order.name) % ICON_BG_COLORS.length];
  const accountIcon = getAccountIcon(account?.accountType ?? "", account?.name ?? "");
  const income = order.type === "income";
  const days = date ? differenceInCalendarDays(parseISO(date), today) : null;
  const subtitle = [account?.name, describeRule(order.recurrenceRule), order.counterParty].filter(Boolean).join(" · ");

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${index % 2 === 1 ? "bg-card-2" : "bg-card"} ${isFirst ? "rounded-t-xl" : ""} ${isLast ? "rounded-b-xl" : ""}`}
    >
      <div className={`size-9 shrink-0 rounded-full flex items-center justify-center ${iconColor}`}>
        <HugeiconsIcon icon={categoryIcon} className="size-4" />
      </div>

      <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
        <p className="text-sm font-medium text-foreground truncate">{order.name || category?.name || "—"}</p>
        <p className="text-xs text-muted truncate sm:hidden">{subtitle}</p>
        <p className="hidden sm:block text-xs text-muted truncate">
          {category?.name ?? "Uncategorized"}
          {order.manualPayment ? " · Manual" : ""}
        </p>
      </div>

      <div className="hidden sm:flex flex-col min-w-0 w-40 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <HugeiconsIcon icon={accountIcon} className="size-3.5 shrink-0" style={{ color: account?.color ?? "var(--muted-foreground)" }} />
          <span className="text-sm text-muted truncate">{account?.name ?? "—"}</span>
        </div>
        <span className="text-xs text-muted truncate">{describeRule(order.recurrenceRule)}</span>
      </div>

      <div className="hidden md:flex flex-1 min-w-0 items-center gap-2">
        <span className="text-sm text-muted truncate">{order.note ?? order.counterParty ?? ""}</span>
        {order.labels.slice(0, 2).map((l) => <LabelChip key={l.id} label={l} />)}
        {order.labels.length > 2 && <span className="text-xs text-muted shrink-0">+{order.labels.length - 2}</span>}
      </div>

      <div className="shrink-0 text-right">
        <p className={`text-sm font-semibold tabular-nums ${income ? "text-success" : "text-danger"}`}>
          {income ? "+" : "-"}{formatMoney(order.amount, order.currencyCode)}
        </p>
        <p className={`text-xs ${days != null && days < 0 ? "text-danger" : "text-muted"}`}>
          {date ? `${format(parseISO(date), "d MMM")} · ${dueLabel(days!)}` : "No upcoming date"}
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  total,
  rows,
  lookups,
  today,
}: {
  title: string;
  total?: string;
  rows: { key: string; order: StandingOrder; date?: string }[];
  lookups: Lookups;
  today: Date;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">{title}</p>
        {total && <span className="text-xs font-medium text-muted tabular-nums">{total}</span>}
      </div>
      <div>
        {rows.map((r, i) => (
          <PaymentRow
            key={r.key}
            order={r.order}
            date={r.date}
            index={i}
            isFirst={i === 0}
            isLast={i === rows.length - 1}
            lookups={lookups}
            today={today}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" }) {
  const color = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className="rounded-xl p-4 space-y-1 bg-card min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-sm font-semibold tabular-nums truncate ${color}`}>{value}</p>
    </div>
  );
}

// ── View ──────────────────────────────────────────────────────────────────────

function PlannedPayments({
  orders,
  items,
  lookups,
}: {
  orders: StandingOrder[];
  items: StandingOrderItem[];
  lookups: Lookups;
}) {
  const router = useRouter();
  const today = startOfDay(new Date());
  const ordersById = new Map(orders.map((o) => [o.id, o]));

  const overdue = items
    .filter((i) => !i.paidDate && differenceInCalendarDays(parseISO(i.originalDate), today) < 0)
    .filter((i) => ordersById.has(i.standingOrderId))
    .sort((a, b) => a.originalDate.localeCompare(b.originalDate))
    .map((i) => ({ key: i.id, order: ordersById.get(i.standingOrderId)!, date: i.originalDate }));

  const scheduled = orders
    .filter((o) => o.dueDate && differenceInCalendarDays(parseISO(o.dueDate), today) >= 0)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const daysUntil = (o: StandingOrder) => differenceInCalendarDays(parseISO(o.dueDate!), today);
  const toRow = (o: StandingOrder) => ({ key: o.id, order: o, date: o.dueDate });
  const thisWeek = scheduled.filter((o) => daysUntil(o) <= 7).map(toRow);
  const thisMonth = scheduled.filter((o) => daysUntil(o) > 7 && daysUntil(o) <= 30).map(toRow);
  const later = scheduled.filter((o) => daysUntil(o) > 30).map(toRow);
  const unscheduled = orders
    .filter((o) => !o.dueDate || daysUntil(o) < 0)
    .map((o) => ({ key: o.id, order: o, date: undefined }));

  const monthly = (type: StandingOrder["type"]) =>
    fmtTotals(
      orders
        .filter((o) => o.type === type)
        .map((o) => ({ amount: o.amount * occurrencesPerMonth(o.recurrenceRule), currencyCode: o.currencyCode }))
    );
  const signedTotal = (rows: { order: StandingOrder }[]) =>
    fmtTotals(rows.map(({ order: o }) => ({ amount: o.type === "income" ? o.amount : -o.amount, currencyCode: o.currencyCode })));
  const next30 = [...thisWeek, ...thisMonth];

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
        Planned Payments
      </h2>

      {orders.length === 0 ? (
        <p className="text-sm text-muted">No planned payments yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="Monthly expenses" value={monthly("expense")} tone="danger" />
            <SummaryCard label="Monthly income" value={monthly("income")} tone="success" />
            <SummaryCard label="Next 30 days" value={signedTotal(next30)} />
            <SummaryCard label="Overdue" value={overdue.length ? signedTotal(overdue) : "None"} tone={overdue.length ? "danger" : undefined} />
          </div>

          <Section title="Overdue" total={signedTotal(overdue)} rows={overdue} lookups={lookups} today={today} />
          <Section title="Next 7 days" total={signedTotal(thisWeek)} rows={thisWeek} lookups={lookups} today={today} />
          <Section title="Next 30 days" total={signedTotal(thisMonth)} rows={thisMonth} lookups={lookups} today={today} />
          <Section title="Later" rows={later} lookups={lookups} today={today} />
          <Section title="No upcoming date" rows={unscheduled} lookups={lookups} today={today} />
        </>
      )}
    </div>
  );
}

export function PlannedPaymentsView() {
  const { session, tokenReady, handleSave } = useDashboard();
  const overdueFrom = format(subDays(new Date(), OVERDUE_LOOKBACK_DAYS), "yyyy-MM-dd");

  const { data: orders = [], isLoading: ordersLoading } = useQuery(standingOrdersQuery(session));
  const { data: items = [], isLoading: itemsLoading } = useQuery(standingOrderItemsQuery(session, overdueFrom));
  const { data: accounts = [] } = useQuery(accountsQuery(session));
  const { data: categories = [] } = useCategories(session);

  if (tokenReady && !session) {
    return <TokenConnectForm onSave={handleSave} />;
  }

  if (!tokenReady || ordersLoading || itemsLoading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  const lookups: Lookups = {
    accounts: new Map(accounts.map((a) => [a.id, a])),
    categories: new Map(categories.map((c) => [c.id, c])),
  };

  return <PlannedPayments orders={orders} items={items} lookups={lookups} />;
}
