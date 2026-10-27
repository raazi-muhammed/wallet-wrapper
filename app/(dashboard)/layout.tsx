import { cookies } from "next/headers";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { DashboardProvider } from "@/app/components/DashboardProvider";
import { DashboardShell } from "@/app/components/DashboardShell";
import { maskToken, readToken, sessionKey } from "@/lib/session";
import { queryKeys } from "@/lib/query-keys";
import { fetchAccounts, fetchCategories, fetchLabels } from "@/lib/wallet-reads";

export default async function DashboardLayout({
  sidebar,
  detail,
}: {
  sidebar: React.ReactNode;
  detail: React.ReactNode;
}) {
  // `children` (the implicit slot) is intentionally never rendered here —
  // all real UI lives in the `@sidebar`/`@detail` slots. See ./page.tsx and
  // ./default.tsx, both of which return null.
  const storedSidebarWidth = (await cookies()).get("wallet_sidebar_percent")?.value;
  const token = await readToken();
  const session = token ? sessionKey(token) : "";

  // Load what every dashboard page needs before sending the HTML, so the first
  // paint has the sidebar and its data instead of skeletons. The layout isn't
  // re-rendered on client navigations, so this runs once per page load. A
  // failed fetch isn't sent; the client query retries it.
  const queryClient = new QueryClient();
  if (token) {
    await Promise.all([
      queryClient.prefetchQuery({ queryKey: queryKeys.accounts(session), queryFn: () => fetchAccounts(token) }),
      queryClient.prefetchQuery({ queryKey: queryKeys.categories(session), queryFn: () => fetchCategories(token) }),
      queryClient.prefetchQuery({ queryKey: queryKeys.labels(session), queryFn: () => fetchLabels(token) }),
    ]);
  }

  return (
    <DashboardProvider session={session} maskedToken={token ? maskToken(token) : ""} storedSidebarWidth={storedSidebarWidth}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DashboardShell sidebar={sidebar} detail={detail} />
      </HydrationBoundary>
    </DashboardProvider>
  );
}
