"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { GripVerticalIcon } from "@hugeicons/core-free-icons"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

// This installed version of react-resizable-panels (v4) exports Group/Panel/
// Separator, not the PanelGroup/Panel/PanelResizeHandle names the shadcn CLI's
// generated wrapper assumes (an older API) — re-pointed to the real exports,
// keeping the familiar Resizable* names shadcn consumers expect.
const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) => (
  <ResizablePrimitive.Group
    className={cn("flex h-full w-full", className)}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.Separator
    // The interactive element (this div) is widened to a comfortable grab
    // area — the shadcn default made it `w-px` (1px), i.e. the *hit area*
    // itself was narrower than its own visible line, making it genuinely
    // hard to grab with a mouse. The thin visible line is now purely the
    // `after:` pseudo-element, centered within this wider box.
    className={cn(
      "relative flex w-2.5 items-center justify-center bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border hover:after:bg-sidebar-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <HugeiconsIcon icon={GripVerticalIcon} className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
