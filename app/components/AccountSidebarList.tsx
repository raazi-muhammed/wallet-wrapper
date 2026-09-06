"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChevronRightIcon,
  LayoutListIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAccounts } from "../actions";
import type { Account } from "../actions";
import { getAccountIcon } from "@/lib/utils";
import { useDashboard } from "./DashboardProvider";

function fmt(amount: number | undefined, currency: string | undefined) {
  if (amount == null || !currency) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function SidebarSkeleton() {
  return (
    <>
      <SidebarHeader className="px-4 pt-4 pb-2">
        <p className="text-xs font-semibold tracking-widest text-sidebar-foreground/50">Accounts</p>
      </SidebarHeader>
      <SidebarContent className="pb-4">
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
        <SidebarSeparator />
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
  return (
    <>
      <SidebarHeader className="px-4 pt-4 pb-2">
        <p className="text-xs font-semibold tracking-widest text-sidebar-foreground/50">Accounts</p>
      </SidebarHeader>
      <SidebarContent className="pb-4">
        <SidebarGroup className="px-4 pt-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0 rounded-lg overflow-hidden bg-card">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"} size="lg" className="rounded-none px-3">
                  <Link href="/">
                    <HugeiconsIcon icon={LayoutListIcon} className="size-4 shrink-0" />
                    <span className="font-medium">All Accounts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem className="before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-separator">
                <SidebarMenuButton asChild isActive={pathname === "/insights"} size="lg" className="rounded-none px-3">
                  <Link href="/insights">
                    <HugeiconsIcon icon={SparklesIcon} className="size-4 shrink-0" />
                    <span className="font-medium">Insights</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

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
                      <SidebarMenuItem key={a.id} className={idx > 0 ? "before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-separator" : ""}>
                        <div className={`group/row relative flex items-center gap-1 px-3 py-3 transition-colors ${isActive ? "bg-sidebar-accent/10 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:rounded-full before:bg-sidebar-primary" : "hover:bg-sidebar-accent/10"}`}>
                          <Link
                            href={`/account/${a.id}`}
                            className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
                          >
                            <div className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${a.color ?? "var(--muted-foreground)"}22` }}>
                              <HugeiconsIcon icon={icon} className="size-4 shrink-0" style={{ color: a.color ?? "currentColor" }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{a.name}</p>
                              <p className={`text-xs tabular-nums ${bal < 0 ? "text-danger" : "text-sidebar-foreground/50"}`}>
                                {fmt(bal, a.balance.currencyCode)}
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

export function AccountSidebarList() {
  const { token } = useDashboard();
  const pathname = usePathname();

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts", token],
    queryFn: () => fetchAccounts(token),
    enabled: !!token,
  });

  const activeAccounts = accounts.filter((a) => !a.archived);
  const initialLoading = !!token && accountsLoading && activeAccounts.length === 0;

  if (!token) return null;

  let content: React.ReactNode;
  if (initialLoading) {
    content = <SidebarSkeleton />;
  } else if (activeAccounts.length > 0) {
    content = <SidebarBody accounts={activeAccounts} pathname={pathname} />;
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
      {content}
    </Sidebar>
  );
}
