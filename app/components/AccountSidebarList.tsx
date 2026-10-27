"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  ChevronRightIcon,
  Database01Icon,
  LayoutListIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { accountsQuery, recordsQuery, statsQuery } from "@/hooks/use-wallet-data";
import { useIdlePreload } from "@/hooks/use-idle-preload";
import type { Account } from "../actions";
import { getAccountIcon } from "@/lib/utils";
import { useDashboard } from "./DashboardProvider";
import { SettingsPopover } from "./SettingsPopover";
import { ErrorBox } from "./EditControls";
import { formatMoney } from "@/lib/format";

function SidebarSkeleton() {
  return (
    <>
      <SidebarContent className="pt-1 pb-4">
        <SidebarGroup className="px-4 pt-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="px-2 py-1.5">
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="px-4 pt-0">
          <SidebarGroupLabel>
            <Skeleton className="h-2.5 w-16" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[...Array(4)].map((_, i) => (
                <SidebarMenuItem key={i}>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Skeleton className="size-4 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-3 w-4 shrink-0" />
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}

function SidebarBody({ accounts, pathname }: { accounts: Account[]; pathname: string }) {
  const { session, period } = useDashboard();
  const queryClient = useQueryClient();
  // Start loading an account's records on hover, so they're usually ready by the time it's clicked.
  const prefetchRecords = (accountId?: string) => queryClient.prefetchInfiniteQuery(recordsQuery(session, accountId, period));

  return (
    <>
      <SidebarContent className="pt-1 pb-4">
        <SidebarGroup className="px-4 pt-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0 rounded-lg overflow-hidden bg-card">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"} size="lg" className="rounded-none px-3">
                  <Link href="/" onPointerEnter={() => prefetchRecords()} onFocus={() => prefetchRecords()}>
                    <HugeiconsIcon icon={LayoutListIcon} className="size-4 shrink-0" />
                    <span className="font-medium">All Accounts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem className="before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-sidebar-border">
                <SidebarMenuButton asChild isActive={pathname === "/insights"} size="lg" className="rounded-none px-3">
                  <Link href="/insights">
                    <HugeiconsIcon icon={SparklesIcon} className="size-4 shrink-0" />
                    <span className="font-medium">Insights</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem className="before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-sidebar-border">
                <SidebarMenuButton asChild isActive={pathname === "/planned"} size="lg" className="rounded-none px-3">
                  <Link href="/planned">
                    <HugeiconsIcon icon={Calendar03Icon} className="size-4 shrink-0" />
                    <span className="font-medium">Planned Payments</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {Array.from(
          accounts.reduce((map, a) => {
            const type = a.accountType || "Other";
            if (!map.has(type)) map.set(type, []);
            map.get(type)!.push(a);
            return map;
          }, new Map<string, typeof accounts>())
        ).sort(([a], [b]) => a.localeCompare(b)).map(([type, accs]) => {
          return (
            <SidebarGroup key={type} className="px-4 pt-0">
              <SidebarGroupLabel className="text-xs font-semibold tracking-widest text-sidebar-foreground/50 px-2">
                {type.replace(/([A-Z])/g, " $1").trim()}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0 rounded-lg overflow-hidden bg-card">
                  {accs.map((a, idx) => {
                    const icon = getAccountIcon(a.accountType, a.name);
                    const bal = a.balance.currentBalance;
                    const isActive = pathname === `/account/${a.id}`;
                    return (
                      <SidebarMenuItem key={a.id} className={idx > 0 ? "before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-sidebar-border" : ""}>
                        <div className={`group/row relative flex items-center gap-1 px-3 py-3 transition-colors ${isActive ? "bg-sidebar-accent/10 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:rounded-full before:bg-sidebar-primary" : "hover:bg-sidebar-accent/10"}`}>
                          <Link
                            href={`/account/${a.id}`}
                            onPointerEnter={() => prefetchRecords(a.id)}
                            onFocus={() => prefetchRecords(a.id)}
                            className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
                          >
                            <div className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${a.color ?? "var(--muted-foreground)"}22` }}>
                              <HugeiconsIcon icon={icon} className="size-4 shrink-0" style={{ color: a.color ?? "currentColor" }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{a.name}</p>
                              <p className={`text-xs tabular-nums ${bal < 0 ? "text-danger" : "text-sidebar-foreground/50"}`}>
                                {formatMoney(bal, a.balance.currencyCode)}
                              </p>
                            </div>
                          </Link>
                          <HugeiconsIcon
                            icon={ChevronRightIcon}
                            className="shrink-0 size-4 text-sidebar-foreground/30"
                          />
                        </div>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </>
  );
}

// The modal (and its forms) loads on first open; until then the sidebar only needs this button.
const ManageDataModal = dynamic(() => import("./ManageDataModal").then((m) => m.ManageDataModal));

function preloadManageData() {
  void import("./ManageDataModal");
}

function ManageDataButton() {
  const [open, setOpen] = useState(false);
  // Mounted from the first open on, so later closes keep the dialog's exit animation.
  const [opened, setOpened] = useState(false);
  useIdlePreload(preloadManageData);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Manage accounts, categories, labels and budgets"
        title="Manage data"
        aria-expanded={open}
        onClick={() => { setOpen(true); setOpened(true); }}
        className="rounded-full text-muted hover:bg-secondary dark:hover:bg-secondary aria-expanded:bg-secondary focus-visible:border-transparent focus-visible:ring-0"
      >
        <HugeiconsIcon icon={Database01Icon} className="size-4" />
      </Button>
      {opened && <ManageDataModal open={open} onOpenChange={setOpen} />}
    </>
  );
}

export function AccountSidebarList() {
  const { session, maskedToken, tokenReady, period, setPeriod, handleSave, handleDisconnect } = useDashboard();
  const pathname = usePathname();

  const { data: accounts = [], isLoading: accountsLoading, error: accountsError } = useQuery(accountsQuery(session));
  const { data: stats = null } = useQuery(statsQuery(session));

  const activeAccounts = accounts.filter((a) => !a.archived);
  const initialLoading = !tokenReady || (!!session && accountsLoading && activeAccounts.length === 0);

  if (tokenReady && !session) return null;

  let content: React.ReactNode;
  if (initialLoading) {
    content = <SidebarSkeleton />;
  } else if (activeAccounts.length > 0) {
    content = <SidebarBody accounts={activeAccounts} pathname={pathname} />;
  } else if (accountsError) {
    content = (
      <div className="px-4 pt-2">
        <ErrorBox error={accountsError} />
      </div>
    );
  } else {
    return null;
  }

  // The resizable Panel (DashboardShell.tsx) already provides the correct,
  // draggable width and a properly bounded, independently-scrollable height,
  // so this just fills whatever box the Panel gives it — `collapsible="none"`
  // renders a plain, non-fixed, non-collapsing column (no separate
  // "floating"/fixed-position variant needed, and no per-breakpoint
  // branching here — same markup at every width).
  return (
    <Sidebar collapsible="none" className="h-full w-full">
      <div className="flex items-center justify-between pl-6 pr-4 pt-2 shrink-0">
        <span className="font-display text-xl font-bold text-sidebar-primary">Wallet</span>
        <div className="flex items-center">
          <ManageDataButton />
          <SettingsPopover
            connected={!!session}
            maskedToken={maskedToken}
            stats={stats}
            period={period}
            setPeriod={setPeriod}
            onSave={handleSave}
            onDisconnect={handleDisconnect}
          />
        </div>
      </div>
      {content}
    </Sidebar>
  );
}
