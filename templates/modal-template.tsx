"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

function ModalTemplate({
  open,
  onOpenChange,
  trigger,
  title,
  className,
  bodyClassName,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
  /** Plain title text. Omit to render no header (e.g. when children render their own). */
  title?: string
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn("max-w-md w-full p-0 overflow-hidden gap-1", className)}>
        {title && (
          <DialogHeader className="px-6 pt-3.5 pb-1 text-left">
            <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className={cn("px-4 pt-0 pb-4 space-y-4", bodyClassName)}>{children}</div>
      </DialogContent>
    </Dialog>
  )
}

export { ModalTemplate }
