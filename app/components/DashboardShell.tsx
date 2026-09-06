"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  useDashboard,
  SIDEBAR_PERCENT_MIN,
  SIDEBAR_PERCENT_MAX,
} from "./DashboardProvider";

// Below the md breakpoint there's no room for a side-by-side split — only
// one of sidebar/detail is shown at a time, driven by the route
// (`isDetailActive`, derived from the pathname so it's identical on the
// server and on first client paint: sidebar at "/", detail everywhere else).
// Desktop keeps both always visible in the resizable two-column layout;
// visibility is toggled via the `data-hidden` attribute + globals.css rather
// than not rendering a Panel at all, since Panel/Separator must stay true DOM
// children of the Group for its resize-drag logic to work.
export function DashboardShell({
  sidebar,
  detail,
}: {
  sidebar: React.ReactNode;
  detail: React.ReactNode;
}) {
  const isDetailActive = usePathname() !== "/";
  const { sidebarWidthPercent, setSidebarWidthPercent } = useDashboard();
  // `defaultSize` is a mount-only hint, not a controlled "current size" prop —
  // it must never be re-fed the live `sidebarWidthPercent`. `onResize` updates
  // that state on every drag frame; passing the updated value straight back
  // into `defaultSize` fights the drag as it happens (the panel's own live
  // size and the "reset to this size" hint racing each other), which
  // produces a "snaps to a fixed width instead of tracking the drag" symptom.
  const [initialSidebarWidthPercent] = useState(() => sidebarWidthPercent);

  return (
    <SidebarProvider>
      {/* Group is pinned to the viewport height and clips at its edge; each
          Panel's own inner div (react-resizable-panels applies `overflow:
          auto` there by default) is what actually scrolls, independently of
          its sibling — do not override that back to `visible`, or overflow
          content is just clipped by the Group with nothing to scroll it. */}
      <ResizablePanelGroup
        orientation="horizontal"
        style={{ height: "100dvh", overflow: "hidden" }}
      >
        <ResizablePanel
          id="sidebar-panel"
          data-hidden={isDetailActive ? "true" : "false"}
          defaultSize={String(initialSidebarWidthPercent)}
          minSize={String(SIDEBAR_PERCENT_MIN)}
          maxSize={String(SIDEBAR_PERCENT_MAX)}
          onResize={(size) => setSidebarWidthPercent(size.asPercentage)}
        >
          {sidebar}
        </ResizablePanel>
        <ResizableHandle className="hidden md:flex after:bg-transparent" />
        <ResizablePanel id="detail-panel" data-hidden={isDetailActive ? "false" : "true"}>
          <main>{detail}</main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  );
}
