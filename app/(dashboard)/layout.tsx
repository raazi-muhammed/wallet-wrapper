import { cookies } from "next/headers";
import { DashboardProvider } from "@/app/components/DashboardProvider";
import { DashboardShell } from "@/app/components/DashboardShell";

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
  return (
    <DashboardProvider storedSidebarWidth={storedSidebarWidth}>
      <DashboardShell sidebar={sidebar} detail={detail} />
    </DashboardProvider>
  );
}
