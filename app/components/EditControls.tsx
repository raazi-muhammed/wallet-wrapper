"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Label, WalletColor, WriteResult } from "../actions";

/** Turns a server action's returned error into a thrown one, so react-query's mutation error state picks it up. */
export function unwrap(result: WriteResult) {
  if (result.error) throw new Error(result.error);
}

// The API only accepts these 16 colour names on writes, but returns hex on reads.
// The hex values are close approximations, used only to draw the swatches.
export const WALLET_COLORS: { name: WalletColor; hex: string }[] = [
  { name: "Red", hex: "#f44336" },
  { name: "Pink", hex: "#e91e63" },
  { name: "Wine", hex: "#880e4f" },
  { name: "Purple", hex: "#9c27b0" },
  { name: "DarkPurple", hex: "#512da8" },
  { name: "Blue", hex: "#2196f3" },
  { name: "LightBlue", hex: "#03a9f4" },
  { name: "Turquoise", hex: "#26c6da" },
  { name: "PineGreen", hex: "#00796b" },
  { name: "Green", hex: "#4caf50" },
  { name: "Lime", hex: "#cddc39" },
  { name: "Yellow", hex: "#ffeb3b" },
  { name: "Orange", hex: "#ff9800" },
  { name: "CoffeeBrown", hex: "#795548" },
  { name: "Stone", hex: "#9e9e9e" },
  { name: "Charcoal", hex: "#455a64" },
];

export function ColorPicker({ value, currentHex, onChange }: {
  value: WalletColor | undefined;
  /** The entity's colour as the API returned it, shown until a new one is picked. */
  currentHex?: string;
  onChange: (c: WalletColor) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {!value && currentHex && (
        <span
          title="Current colour"
          className="size-7 rounded-full ring-2 ring-offset-2 ring-offset-background ring-foreground/60"
          style={{ background: currentHex }}
        />
      )}
      {WALLET_COLORS.map((c) => (
        <button
          key={c.name}
          type="button"
          title={c.name.replace(/([A-Z])/g, " $1").trim()}
          aria-label={c.name}
          aria-pressed={value === c.name}
          onClick={() => onChange(c.name)}
          className={cn(
            "size-7 rounded-full flex items-center justify-center transition-transform hover:scale-110",
            value === c.name && "ring-2 ring-offset-2 ring-offset-background ring-foreground"
          )}
          style={{ background: c.hex }}
        >
          {value === c.name && <HugeiconsIcon icon={Tick02Icon} className="size-3.5 text-white" />}
        </button>
      ))}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-foreground mb-1.5 pl-3">{children}</label>;
}

export function ToggleRow({ label, description, checked, onChange, disabled }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2.5", disabled ? "opacity-50" : "cursor-pointer")}>
      <span className="min-w-0">
        <span className="block text-sm text-foreground">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 shrink-0 accent-primary"
      />
    </label>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
      {message}
    </div>
  );
}

// ── Multi-select ──────────────────────────────────────────────────────────────

type SelectItem = { id: string; name: string; color?: string };

export function MultiSelect({ items, value, onChange, onCreate, placeholder = "Select…", noun = "items" }: {
  items: SelectItem[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** When given, offers to create an item from the search text. */
  onCreate?: (name: string) => Promise<void>;
  placeholder?: string;
  /** Plural noun used in the search placeholder and empty state. */
  noun?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<unknown>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = search.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  const exact = items.some((i) => i.name.toLowerCase() === q);
  const selected = items.filter((i) => value.includes(i.id));

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  async function create() {
    if (!onCreate || !search.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await onCreate(search.trim());
      setSearch("");
    } catch (e) {
      setCreateError(e);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setTimeout(() => inputRef.current?.focus(), 50); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full min-h-10 flex items-center justify-between gap-2 rounded-lg border-0 bg-card px-3 py-1.5 text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {selected.length > 0 ? (
            <span className="flex flex-wrap gap-1 min-w-0">
              {selected.map((i) => <LabelChip key={i.id} label={i} />)}
            </span>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 border-0 bg-card w-[var(--radix-popover-trigger-width)] min-w-56 pointer-events-auto overflow-hidden"
        style={{ maxHeight: "min(280px, var(--radix-popover-content-available-height, 280px))", display: "flex", flexDirection: "column" }}
        align="start"
        sideOffset={4}
      >
        <div className="p-2 shrink-0">
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && q && !exact) { e.preventDefault(); create(); } }}
            placeholder={onCreate ? "Search or create…" : `Search ${noun}…`}
            className="w-full rounded-lg border-0 bg-card text-foreground text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
          />
        </div>
        <div className="overflow-y-auto flex-1 min-h-0" onWheel={(e) => e.stopPropagation()}>
          {filtered.map((i) => {
            const checked = value.includes(i.id);
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => toggle(i.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-default transition-colors ${checked ? "font-semibold text-accent" : "text-foreground"}`}
              >
                <span className="size-2.5 rounded-full shrink-0" style={{ background: i.color ?? "var(--muted-foreground)" }} />
                <span className="truncate flex-1">{i.name}</span>
                {checked && <HugeiconsIcon icon={Tick02Icon} className="size-3.5 shrink-0" />}
              </button>
            );
          })}
          {onCreate && q && !exact && (
            <button
              type="button"
              onClick={create}
              disabled={creating}
              className="w-full px-3 py-2 text-sm text-left text-accent hover:bg-default transition-colors disabled:opacity-50"
            >
              {creating ? "Creating…" : `Create “${search.trim()}”`}
            </button>
          )}
          {createError ? <p className="px-3 py-2 text-xs text-danger">{createError instanceof Error ? createError.message : String(createError)}</p> : null}
          {filtered.length === 0 && !(onCreate && q) && (
            <p className="px-3 py-4 text-sm text-muted text-center">No {noun} found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Label picker: hides archived labels unless they are already selected. */
export function LabelSelect({ labels, value, ...props }: Omit<Parameters<typeof MultiSelect>[0], "items" | "noun"> & { labels: Label[] }) {
  return (
    <MultiSelect
      items={labels.filter((l) => !l.archived || value.includes(l.id))}
      value={value}
      noun="labels"
      placeholder="Add labels"
      {...props}
    />
  );
}

export function LabelChip({ label }: { label: { name: string; color?: string } }) {
  const color = label.color ?? "#888";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: `${color}26`, color }}
    >
      {label.name}
    </span>
  );
}
