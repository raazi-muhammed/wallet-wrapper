"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowLeft01Icon, ChevronRightIcon, Database01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModalTemplate } from "@/templates/modal-template";
import {
  fetchAccounts,
  fetchBudgets,
  patchBudgets,
  patchCategories,
  createSubcategory,
  patchLabels,
  createLabel,
} from "../actions";
import type { Account, Budget, Category, Label, WalletColor } from "../actions";
import type { PatchBudgetItem, PatchCategoryItem } from "@/lib/wallet-client";
import { getAccountIcon } from "@/lib/utils";
import { useCategories, useLabels } from "@/hooks/use-wallet-data";
import { AccountForm } from "./AccountEditModal";
import { ColorPicker, ErrorBox, FieldLabel, LabelChip, MultiSelect, ToggleRow, unwrap } from "./EditControls";
import { useDashboard } from "./DashboardProvider";

type Tab = "accounts" | "categories" | "labels" | "budgets";
type Cardinality = NonNullable<Category["cardinality"]>;

const CARDINALITIES: { id: Cardinality; label: string }[] = [
  { id: "none", label: "None" },
  { id: "must", label: "Must" },
  { id: "need", label: "Need" },
  { id: "want", label: "Want" },
];

/** Splits an old/new id list into the add/remove patch form the API accepts, or undefined when unchanged. */
function idsDiff(before: string[], after: string[]) {
  const add = after.filter((id) => !before.includes(id));
  const remove = before.filter((id) => !after.includes(id));
  if (add.length === 0 && remove.length === 0) return undefined;
  return { ...(add.length > 0 ? { add } : {}), ...(remove.length > 0 ? { remove } : {}) };
}

// ── Shared list pieces ────────────────────────────────────────────────────────

function ListRow({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-default transition-colors"
    >
      {children}
      <HugeiconsIcon icon={ChevronRightIcon} className="size-4 text-muted shrink-0 ml-auto" />
    </button>
  );
}

function ListCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-card overflow-hidden divide-y divide-separator">{children}</div>;
}

function Swatch({ color }: { color?: string }) {
  return <span className="size-3 rounded-full shrink-0" style={{ background: color ?? "var(--muted-foreground)" }} />;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted shrink-0">{children}</span>;
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
    </div>
  );
}

function SaveRow({ onCancel, onSave, pending, disabled, label = "Save changes" }: {
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="card" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSave} disabled={pending || disabled}>{pending ? "Saving…" : label}</Button>
    </div>
  );
}

// ── Accounts ──────────────────────────────────────────────────────────────────

function AccountsTab({ onOpen }: { onOpen: (a: Account) => void }) {
  const { token } = useDashboard();
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts", token],
    queryFn: () => fetchAccounts(token),
    enabled: !!token,
  });
  if (isLoading || !accounts) return <ListSkeleton />;

  const sorted = [...accounts].sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name));
  return (
    <ListCard>
      {sorted.map((a) => (
        <ListRow key={a.id} onClick={() => onOpen(a)}>
          <HugeiconsIcon icon={getAccountIcon(a.accountType, a.name)} className="size-4 shrink-0" style={{ color: a.color ?? "currentColor" }} />
          <span className={`text-sm truncate ${a.archived ? "text-muted" : "text-foreground"}`}>{a.name}</span>
          {a.archived && <Muted>Archived</Muted>}
          {a.isBankSync && <Muted>Bank sync</Muted>}
        </ListRow>
      ))}
    </ListCard>
  );
}

// ── Categories ────────────────────────────────────────────────────────────────

function CategoriesTab({ onOpen }: { onOpen: (c: Category) => void }) {
  const { token } = useDashboard();
  const { data: categories, isLoading } = useCategories(token);
  const [search, setSearch] = useState("");
  if (isLoading || !categories) return <ListSkeleton />;

  const q = search.trim().toLowerCase();
  const filtered = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories;
  const groups = new Map<string, Category[]>();
  for (const c of filtered) {
    const key = c.group?.name ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }

  return (
    <div className="space-y-3">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories…" className="rounded-lg" />
      {[...groups.entries()].map(([group, items]) => (
        <div key={group} className="space-y-1.5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider pl-3">{group}</p>
          <ListCard>
            {items.map((c) => (
              <ListRow key={c.id} onClick={() => onOpen(c)}>
                <Swatch color={c.color} />
                <span className="text-sm text-foreground truncate">{c.name}</span>
                {c.customCategory && <Muted>Custom</Muted>}
                {c.cardinality && c.cardinality !== "none" && <Muted>{c.cardinality}</Muted>}
              </ListRow>
            ))}
          </ListCard>
        </div>
      ))}
      {filtered.length === 0 && <p className="text-center text-sm text-muted py-6">No categories found</p>}
    </div>
  );
}

function CategoryForm({ category, onDone }: { category: Category; onDone: () => void }) {
  const { token, invalidateAll } = useDashboard();
  const isBase = !category.customCategory;
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState<WalletColor | undefined>();
  const [cardinality, setCardinality] = useState<Cardinality>(category.cardinality ?? "none");
  const [reset, setReset] = useState<Set<"name" | "color" | "cardinality">>(new Set());

  function toggleReset(field: "name" | "color" | "cardinality", on: boolean) {
    setReset((prev) => {
      const next = new Set(prev);
      if (on) next.add(field); else next.delete(field);
      return next;
    });
  }

  const { mutate: save, isPending, error } = useMutation({
    mutationFn: async () => {
      // A field can't be both set and reset in one call, so reset wins.
      const patch: PatchCategoryItem = { id: category.id };
      if (!reset.has("name") && name.trim() && name.trim() !== category.name) patch.name = name.trim();
      if (!reset.has("color") && color) patch.color = color;
      if (!reset.has("cardinality") && cardinality !== (category.cardinality ?? "none")) patch.cardinality = cardinality;
      if (reset.size > 0) patch.reset = [...reset];
      if (Object.keys(patch).length > 1) unwrap(await patchCategories(token, [patch]));
    },
    onSuccess: () => { invalidateAll(); onDone(); },
  });

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Name</FieldLabel>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} disabled={reset.has("name")} className="rounded-lg" />
      </div>
      <div className={reset.has("color") ? "opacity-50 pointer-events-none" : ""}>
        <FieldLabel>Colour</FieldLabel>
        <ColorPicker value={color} currentHex={category.color} onChange={setColor} />
      </div>
      <div>
        <FieldLabel>Need / want</FieldLabel>
        <Select value={cardinality} onValueChange={(v) => setCardinality(v as Cardinality)} disabled={reset.has("cardinality")}>
          <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CARDINALITIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isBase && (
        <div className="space-y-2">
          <FieldLabel>Restore system defaults</FieldLabel>
          <ToggleRow label="Default name" checked={reset.has("name")} onChange={(v) => toggleReset("name", v)} disabled={!category.customName && !reset.has("name")} />
          <ToggleRow label="Default colour" description="Uses the colour of the category's group" checked={reset.has("color")} onChange={(v) => toggleReset("color", v)} />
          <ToggleRow label="Default need / want" checked={reset.has("cardinality")} onChange={(v) => toggleReset("cardinality", v)} />
        </div>
      )}
      {category.parentName && <p className="text-xs text-muted pl-3">Subcategory of {category.parentName}</p>}
      <ErrorBox error={error} />
      <SaveRow onCancel={onDone} onSave={() => save()} pending={isPending} disabled={!name.trim() && !reset.has("name")} />
    </div>
  );
}

function SubcategoryForm({ parent, onDone }: { parent: Category; onDone: () => void }) {
  const { token, invalidateAll } = useDashboard();
  const [name, setName] = useState("");
  const [color, setColor] = useState<WalletColor | undefined>();
  const [cardinality, setCardinality] = useState<Cardinality | "inherit">("inherit");

  const { mutate: save, isPending, error } = useMutation({
    mutationFn: async () => unwrap(await createSubcategory(token, {
      parentId: parent.id,
      name: name.trim(),
      ...(color ? { color } : {}),
      ...(cardinality !== "inherit" ? { cardinality } : {}),
    })),
    onSuccess: () => { invalidateAll(); onDone(); },
  });

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Name</FieldLabel>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus className="rounded-lg" />
      </div>
      <div>
        <FieldLabel>Colour (defaults to the parent&apos;s)</FieldLabel>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div>
        <FieldLabel>Need / want</FieldLabel>
        <Select value={cardinality} onValueChange={(v) => setCardinality(v as Cardinality | "inherit")}>
          <SelectTrigger className="w-full rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">Same as {parent.name}</SelectItem>
            {CARDINALITIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <ErrorBox error={error} />
      <SaveRow onCancel={onDone} onSave={() => save()} pending={isPending} disabled={!name.trim()} label="Create" />
    </div>
  );
}

// ── Labels ────────────────────────────────────────────────────────────────────

function LabelsTab({ onOpen }: { onOpen: (l: Label) => void }) {
  const { token } = useDashboard();
  const { data: labels, isLoading } = useLabels(token);
  if (isLoading || !labels) return <ListSkeleton />;
  if (labels.length === 0) return <p className="text-center text-sm text-muted py-6">No labels yet</p>;

  const sorted = [...labels].sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name));
  return (
    <ListCard>
      {sorted.map((l) => (
        <ListRow key={l.id} onClick={() => onOpen(l)}>
          <LabelChip label={l} />
          {l.archived && <Muted>Archived</Muted>}
        </ListRow>
      ))}
    </ListCard>
  );
}

function LabelForm({ label, onDone }: { label?: Label; onDone: () => void }) {
  const { token, invalidateAll } = useDashboard();
  const [name, setName] = useState(label?.name ?? "");
  const [color, setColor] = useState<WalletColor | undefined>();
  const [archived, setArchived] = useState(label?.archived ?? false);

  const { mutate: save, isPending, error } = useMutation({
    mutationFn: async () => {
      if (!label) {
        unwrap(await createLabel(token, { name: name.trim(), ...(color ? { color } : {}) }));
        return;
      }
      const patch = {
        id: label.id,
        ...(name.trim() !== label.name ? { name: name.trim() } : {}),
        ...(color ? { color } : {}),
        ...(archived !== label.archived ? { archived } : {}),
      };
      if (Object.keys(patch).length > 1) unwrap(await patchLabels(token, [patch]));
    },
    onSuccess: () => { invalidateAll(); onDone(); },
  });

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Name</FieldLabel>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus={!label} className="rounded-lg" />
      </div>
      <div>
        <FieldLabel>Colour{label ? "" : " (random if not picked)"}</FieldLabel>
        <ColorPicker value={color} currentHex={label?.color} onChange={setColor} />
      </div>
      {label && (
        <ToggleRow label="Archived" description="Hidden from label pickers" checked={archived} onChange={setArchived} />
      )}
      <ErrorBox error={error} />
      <SaveRow onCancel={onDone} onSave={() => save()} pending={isPending} disabled={!name.trim()} label={label ? "Save changes" : "Create"} />
    </div>
  );
}

// ── Budgets ───────────────────────────────────────────────────────────────────

const BUDGET_TYPE_LABELS: Record<Budget["type"], string> = {
  BUDGET_INTERVAL_WEEK: "Weekly",
  BUDGET_INTERVAL_MONTH: "Monthly",
  BUDGET_INTERVAL_YEAR: "Yearly",
  BUDGET_CUSTOM: "Custom period",
  BUDGET_ALL: "All time (legacy)",
};

function fmtMoney(value: number | null, currency: string) {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

function BudgetsTab({ onOpen }: { onOpen: (b: Budget) => void }) {
  const { token } = useDashboard();
  const { data: budgets, isLoading } = useQuery({
    queryKey: ["budgets", token],
    queryFn: () => fetchBudgets(token),
    enabled: !!token,
  });
  if (isLoading || !budgets) return <ListSkeleton />;
  if (budgets.length === 0) return <p className="text-center text-sm text-muted py-6">No budgets yet</p>;

  const sorted = [...budgets].sort((a, b) => Number(a.closed) - Number(b.closed) || a.name.localeCompare(b.name));
  return (
    <ListCard>
      {sorted.map((b) => (
        <ListRow key={b.id} onClick={() => onOpen(b)}>
          <span className="min-w-0">
            <span className={`block text-sm truncate ${b.closed ? "text-muted" : "text-foreground"}`}>{b.name}</span>
            <span className="block text-xs text-muted">{BUDGET_TYPE_LABELS[b.type]} · {fmtMoney(b.limit, b.currencyCode)}</span>
          </span>
          {b.closed && <Muted>Closed</Muted>}
        </ListRow>
      ))}
    </ListCard>
  );
}

function BudgetForm({ budget, onDone }: { budget: Budget; onDone: () => void }) {
  const { token, invalidateAll } = useDashboard();
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts", token], queryFn: () => fetchAccounts(token), enabled: !!token });
  const { data: categories = [] } = useCategories(token);
  const { data: labels = [] } = useLabels(token);

  const isCustom = budget.type === "BUDGET_CUSTOM";
  const readOnly = budget.type === "BUDGET_ALL";
  const [name, setName] = useState(budget.name);
  const [limit, setLimit] = useState(budget.limit == null ? "" : String(budget.limit));
  const [closed, setClosed] = useState(budget.closed);
  const [startDate, setStartDate] = useState(budget.startDate ?? "");
  const [endDate, setEndDate] = useState(budget.endDate ?? "");
  const [accountIds, setAccountIds] = useState(budget.accountIds);
  const [categoryIds, setCategoryIds] = useState(budget.categoryIds);
  const [labelIds, setLabelIds] = useState(budget.labelIds);

  const limitValue = Number(limit);
  const limitChanged = limit.trim() !== "" && limitValue !== budget.limit;
  const limitInvalid = limitChanged && !(limitValue > 0);

  const { mutate: save, isPending, error } = useMutation({
    mutationFn: async () => {
      const patch: PatchBudgetItem = { id: budget.id };
      if (name.trim() && name.trim() !== budget.name) patch.name = name.trim();
      // resetLimit is the only way to change the base limit; it also clears every period override.
      if (limitChanged) patch.resetLimit = limitValue;
      if (closed !== budget.closed) patch.closed = closed;
      if (isCustom && startDate && startDate !== budget.startDate) patch.startDate = startDate;
      if (isCustom && endDate && endDate !== budget.endDate) patch.endDate = endDate;
      const accountDiff = idsDiff(budget.accountIds, accountIds);
      const categoryDiff = idsDiff(budget.categoryIds, categoryIds);
      const labelDiff = idsDiff(budget.labelIds, labelIds);
      if (accountDiff) patch.accountIds = accountDiff;
      if (categoryDiff) patch.categoryIds = categoryDiff;
      if (labelDiff) patch.labelIds = labelDiff;
      if (Object.keys(patch).length > 1) unwrap(await patchBudgets(token, [patch]));
    },
    onSuccess: () => { invalidateAll(); onDone(); },
  });

  if (readOnly) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">&ldquo;{budget.name}&rdquo; is a legacy all-time budget, which the API treats as read-only.</p>
        <Button variant="card" className="w-full" onClick={onDone}>Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Name</FieldLabel>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="rounded-lg" />
      </div>
      <div>
        <FieldLabel>Limit ({budget.currencyCode})</FieldLabel>
        <Input type="number" min={0} step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} className="rounded-lg" aria-invalid={limitInvalid} />
        <p className="text-xs text-muted mt-1 pl-3">
          {limitInvalid ? "The limit must be greater than zero." : "Changing it sets one limit for every period and removes per-period overrides."}
        </p>
      </div>
      {isCustom && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Start</FieldLabel>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg" />
          </div>
          <div>
            <FieldLabel>End</FieldLabel>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg" />
          </div>
        </div>
      )}
      <div>
        <FieldLabel>Accounts</FieldLabel>
        <MultiSelect
          items={accounts.filter((a) => !a.archived || accountIds.includes(a.id))}
          value={accountIds}
          onChange={setAccountIds}
          placeholder="All accounts"
          noun="accounts"
        />
      </div>
      <div>
        <FieldLabel>Categories</FieldLabel>
        <MultiSelect items={categories} value={categoryIds} onChange={setCategoryIds} placeholder="All categories" noun="categories" />
      </div>
      <div>
        <FieldLabel>Labels</FieldLabel>
        <MultiSelect
          items={labels.filter((l) => !l.archived || labelIds.includes(l.id))}
          value={labelIds}
          onChange={setLabelIds}
          placeholder="Any label"
          noun="labels"
        />
      </div>
      <ToggleRow label="Closed" description="Closing stamps today's date; reopening clears it" checked={closed} onChange={setClosed} />
      <p className="text-xs text-muted pl-3">Type ({BUDGET_TYPE_LABELS[budget.type]}) and currency can&apos;t be changed.</p>
      <ErrorBox error={error} />
      <SaveRow onCancel={onDone} onSave={() => save()} pending={isPending} disabled={!name.trim() || limitInvalid} />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

type Detail =
  | { kind: "account"; item: Account }
  | { kind: "category"; item: Category }
  | { kind: "subcategory"; parent: Category }
  | { kind: "label"; item?: Label }
  | { kind: "budget"; item: Budget };

function detailTitle(d: Detail) {
  switch (d.kind) {
    case "account": return `Edit ${d.item.name}`;
    case "category": return `Edit ${d.item.name}`;
    case "subcategory": return `New subcategory of ${d.parent.name}`;
    case "label": return d.item ? `Edit ${d.item.name}` : "New label";
    case "budget": return `Edit ${d.item.name}`;
  }
}

export function ManageDataModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("accounts");
  const [detail, setDetail] = useState<Detail | null>(null);
  const back = () => setDetail(null);

  return (
    <ModalTemplate
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) setDetail(null); }}
      title="Manage data"
      className="max-w-lg max-h-[90vh] flex flex-col"
      bodyClassName="flex flex-col flex-1 min-h-0 space-y-3"
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Manage accounts, categories, labels and budgets"
          title="Manage data"
          className="rounded-full text-muted hover:bg-secondary dark:hover:bg-secondary aria-expanded:bg-secondary focus-visible:border-transparent focus-visible:ring-0"
        >
          <HugeiconsIcon icon={Database01Icon} className="size-4" />
        </Button>
      }
    >
      {detail ? (
        <>
          <button onClick={back} className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground pl-2 shrink-0">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            <span className="truncate">{detailTitle(detail)}</span>
          </button>
          <div className="overflow-y-auto flex-1 min-h-0 px-1 pb-1">
            {detail.kind === "account" && <AccountForm account={detail.item} onDone={back} onCancel={back} />}
            {detail.kind === "category" && (
              <div className="space-y-4">
                <CategoryForm category={detail.item} onDone={back} />
                {!detail.item.customCategory && (
                  <Button variant="ghost" className="w-full" onClick={() => setDetail({ kind: "subcategory", parent: detail.item })}>
                    <HugeiconsIcon icon={Add01Icon} className="size-4" /> Add subcategory
                  </Button>
                )}
              </div>
            )}
            {detail.kind === "subcategory" && <SubcategoryForm parent={detail.parent} onDone={back} />}
            {detail.kind === "label" && <LabelForm label={detail.item} onDone={back} />}
            {detail.kind === "budget" && <BudgetForm budget={detail.item} onDone={back} />}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 shrink-0">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex-1">
              <TabsList className="bg-card w-full">
                <TabsTrigger value="accounts" className="flex-1">Accounts</TabsTrigger>
                <TabsTrigger value="categories" className="flex-1">Categories</TabsTrigger>
                <TabsTrigger value="labels" className="flex-1">Labels</TabsTrigger>
                <TabsTrigger value="budgets" className="flex-1">Budgets</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {tab === "labels" && (
            <Button variant="card" size="sm" className="self-end shrink-0" onClick={() => setDetail({ kind: "label" })}>
              <HugeiconsIcon icon={Add01Icon} className="size-3.5" /> New label
            </Button>
          )}
          <div className="overflow-y-auto flex-1 min-h-0 pb-1">
            {tab === "accounts" && <AccountsTab onOpen={(item) => setDetail({ kind: "account", item })} />}
            {tab === "categories" && <CategoriesTab onOpen={(item) => setDetail({ kind: "category", item })} />}
            {tab === "labels" && <LabelsTab onOpen={(item) => setDetail({ kind: "label", item })} />}
            {tab === "budgets" && <BudgetsTab onOpen={(item) => setDetail({ kind: "budget", item })} />}
          </div>
        </>
      )}
    </ModalTemplate>
  );
}
