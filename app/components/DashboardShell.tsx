"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";

// Visibility is driven entirely by CSS breakpoints + `isDetailActive` (derived
// from the route, so it's identical on the server and on first client paint)
// rather than the viewport-width `useIsMobile()` hook. That hook's value is
// unknown until an effect runs after mount, so gating the page's structure on
// it would make a mobile visitor briefly see the *detail* pane at "/" (its
// wrapper had no responsive hiding) before flipping to the sidebar.
//
// `useSelectedLayoutSegment("detail")` looked like the more "official" tool
// for this, but in this Next.js version it does not return null for a named
// slot's own bare-root page (verified against the prerendered HTML for both
// "/" and "/insights" — both came out identical) — so it can't distinguish
// root from a real detail route here. `usePathname()` sidesteps that: it's
// exactly as SSR-safe (no `window` access) and unambiguous.
export function DashboardShell({
  sidebar,
  detail,
}: {
  sidebar: React.ReactNode;
  detail: React.ReactNode;
}) {
  const isDetailActive = usePathname() !== "/";

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem" } as React.CSSProperties}>
      <div className={isDetailActive ? "hidden md:contents" : "contents"}>{sidebar}</div>
      <div
        className={`flex-1 flex-col h-dvh md:h-screen overflow-hidden ${
          isDetailActive ? "flex" : "hidden md:flex"
        }`}
      >
        <main className="flex-1 overflow-y-auto">{detail}</main>
      </div>
    </SidebarProvider>
  );
}
