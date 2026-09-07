"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

// A pixel width has no relationship to how wide the viewport actually is —
// persisted from a desktop session, it can exceed a phone's entire screen,
// so the sidebar is sized as a *percentage* of the available space instead.
// Percentages are inherently safe at any viewport width, with no client
// measurement (and its "window.innerWidth reads 0 for a moment" pitfalls)
// required.
const SIDEBAR_WIDTH_STORAGE_KEY = "wallet_sidebar_percent";
const SIDEBAR_PERCENT_DEFAULT = 20;
export const SIDEBAR_PERCENT_MIN = 15;
export const SIDEBAR_PERCENT_MAX = 50;

function getInitialSidebarWidthPercent() {
  if (typeof window === "undefined") return SIDEBAR_PERCENT_DEFAULT;
  const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
  return stored >= SIDEBAR_PERCENT_MIN && stored <= SIDEBAR_PERCENT_MAX ? stored : SIDEBAR_PERCENT_DEFAULT;
}

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
  // `defaultSize` is a mount-only hint, not a controlled "current size" prop,
  // so the persisted width only ever needs to be read once, here, at mount —
  // it doesn't need to live in React state at all. `onResize` fires on every
  // drag frame; it used to funnel through DashboardContext so the width could
  // be seeded from state, but that meant every pixel of dragging re-rendered
  // the *entire* dashboard tree (sidebar list, records list, everything) via
  // context, purely to keep a value in sync that nothing ever reads back
  // reactively. Persisting straight to localStorage on each frame, with no
  // state update, keeps the drag itself (which react-resizable-panels already
  // renders imperatively) perfectly smooth.
  const [initialSidebarWidthPercent] = useState(getInitialSidebarWidthPercent);

  function persistSidebarWidth(percent: number) {
    const clamped = Math.min(SIDEBAR_PERCENT_MAX, Math.max(SIDEBAR_PERCENT_MIN, percent));
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clamped));
  }

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
          onResize={(size) => persistSidebarWidth(size.asPercentage)}
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
