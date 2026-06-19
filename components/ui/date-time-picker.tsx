"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export function DateTimePicker({ value, onChange, className }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    const next = new Date(day);
    next.setHours(value.getHours(), value.getMinutes());
    onChange(next);
  }

  function handleHours(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0));
    const next = new Date(value);
    next.setHours(v);
    onChange(next);
  }

  function handleMinutes(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0));
    const next = new Date(value);
    next.setMinutes(v);
    onChange(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-2 rounded-xl bg-[#1F1F1E] px-3 py-2.5 text-sm text-left text-foreground focus:outline-none focus:ring-2 focus:ring-accent",
            className
          )}
        >
          <CalendarIcon className="size-4 text-muted shrink-0" />
          <span>{format(value, "dd MMM yyyy, hh:mm a")}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-0 bg-[#1F1F1E] shadow-xl"
        align="start"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDaySelect}
          captionLayout="dropdown"
          initialFocus
        />
        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
          <span className="text-xs text-muted">Time</span>
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="number"
              min={0}
              max={23}
              value={String(value.getHours()).padStart(2, "0")}
              onChange={handleHours}
              className="w-12 rounded-md bg-white/10 text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent py-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-muted">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={String(value.getMinutes()).padStart(2, "0")}
              onChange={handleMinutes}
              className="w-12 rounded-md bg-white/10 text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent py-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-3 text-xs text-accent font-medium hover:text-accent/80 transition-colors"
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
