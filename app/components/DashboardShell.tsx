"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useDashboard, SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX } from "./DashboardProvider";

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
  const { sidebarWidth, setSidebarWidth } = useDashboard();
  // `defaultSize` is a mount-only hint, not a controlled "current size" prop —
  // it must never be re-fed the live `sidebarWidth`. `onResize` updates that
  // state on every drag frame; passing the updated value straight back into
  // `defaultSize` fights the drag as it happens (the panel's own live size
  // and the "reset to this size" hint racing each other), which is what
  // produced the "snaps to a fixed width instead of tracking the drag"
  // symptom — reproduced only with `onResize` actually firing (this needs a
  // genuinely visible tab; the automated browser pane's tab is always
  // backgrounded, so its ResizeObserver-driven onResize never fired there,
  // which is why that environment never exposed this bug).
  const [initialSidebarWidth] = useState(() => sidebarWidth);

  return (
    // Only here for the SidebarContext SidebarMenuButton etc. need — the
    // resizable Panel below (not this "--sidebar-width" var) now owns the
    // sidebar's actual width on both mobile and desktop.
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}>
      <ResizablePanelGroup
        orientation="horizontal"
        style={{ height: "100dvh", overflow: "hidden" }}
      >
        {/* Panel/Separator must be true DOM children of the Group (its resize
            drag logic walks real DOM siblings, not just the CSS layout tree) —
            a `display:contents` wrapper here breaks dragging even though the
            static layout still looks right. Mobile-only hiding is instead done
            via the `data-hidden` attribute + globals.css (see there). */}
        <ResizablePanel
          id="sidebar-panel"
          data-hidden={isDetailActive ? "true" : "false"}
          defaultSize={initialSidebarWidth}
          minSize={SIDEBAR_WIDTH_MIN}
          maxSize={SIDEBAR_WIDTH_MAX}
          onResize={(size) => setSidebarWidth(size.inPixels)}
          style={{ overflow: "visible" }}
        >
          {sidebar}
        </ResizablePanel>
        <ResizableHandle className="hidden md:flex" />
        <ResizablePanel
          id="detail-panel"
          data-hidden={isDetailActive ? "false" : "true"}
          style={{ overflow: "visible" }}
        >
          <main className="h-full overflow-y-auto">{detail}</main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  );
}
