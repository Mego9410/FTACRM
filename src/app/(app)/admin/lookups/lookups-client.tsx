"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LookupType } from "@/lib/lookups";
import { Badge, Button, Card, CardHeader, Field, Input, LookupPill } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { createLookupType, reorderLookupValues, saveLookupValue } from "./actions";

type TypeSummary = Omit<LookupType, "values">;
type Value = LookupType["values"][number];

export function LookupsClient({ types, selected }: { types: TypeSummary[]; selected: LookupType | null }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Value | "new" | null>(null);
  const [newTypeOpen, setNewTypeOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const current = editing === "new" ? null : editing;

  async function submitValue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const useColor = f.get("use_color") === "on";
    const res = await saveLookupValue({
      id: current?.id,
      lookup_type_id: selected.id,
      value: String(f.get("value")),
      color: useColor ? String(f.get("color")) : null,
      is_active: f.get("is_active") === "on",
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  async function submitType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const key = String(f.get("key"));
    const res = await createLookupType({ key, label: String(f.get("label")) });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setNewTypeOpen(false);
    router.push(`/admin/lookups?type=${key}`);
    router.refresh();
  }

  async function move(index: number, dir: -1 | 1) {
    if (!selected) return;
    const ids = selected.values.map((v) => v.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j]!, ids[index]!];
    await reorderLookupValues({ ids });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <Card className="shrink-0 lg:w-64">
        <CardHeader
          title="Lists"
          action={<Button variant="ghost" size="sm" onClick={() => setNewTypeOpen(true)}>Add</Button>}
        />
        <nav className="p-2">
          {types.map((t) => (
            <Link
              key={t.key}
              href={`/admin/lookups?type=${t.key}`}
              className={cn(
                "block rounded-[10px] px-3 py-2 text-sm font-semibold",
                selected?.key === t.key ? "bg-gold-tint text-gold-deep" : "text-fg-2 hover:bg-surface-2",
              )}
            >
              {t.label}
              {t.is_system ? <span className="ml-1.5 text-[10px] font-bold uppercase text-fg-4">system</span> : null}
            </Link>
          ))}
        </nav>
      </Card>

      <Card className="min-w-0 flex-1">
        <CardHeader
          title={selected ? selected.label : "Select a list"}
          action={selected ? <Button size="sm" onClick={() => setEditing("new")}>Add value</Button> : undefined}
        />
        {selected ? (
          <ul>
            {selected.values.map((v, i) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5 last:border-0 hover:bg-surface-2/60"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <LookupPill color={v.color}>{v.value}</LookupPill>
                  {!v.is_active ? <Badge>Inactive</Badge> : null}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => void move(i, -1)} disabled={i === 0} className="rounded p-1 text-fg-3 hover:bg-surface-3 disabled:opacity-30" aria-label="Move up">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" onClick={() => void move(i, 1)} disabled={i === selected.values.length - 1} className="rounded p-1 text-fg-3 hover:bg-surface-3 disabled:opacity-30" aria-label="Move down">
                    <ArrowDown size={14} />
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(v)}>Edit</Button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={current ? `Edit “${current.value}”` : "Add value"}>
        <form onSubmit={submitValue} className="space-y-4">
          <Field label="Value" htmlFor="lv_value">
            <Input id="lv_value" name="value" defaultValue={current?.value} required />
          </Field>
          <div className="grid grid-cols-2 items-end gap-3">
            <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-fg-1">
              <input type="checkbox" name="use_color" defaultChecked={!!current?.color} className="h-4 w-4 accent-[#E4AD25]" />
              Pill colour
            </label>
            <Input name="color" type="color" defaultValue={current?.color ?? "#B4862A"} className="h-9.5 p-1" />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-fg-1">
            <input type="checkbox" name="is_active" defaultChecked={current?.is_active ?? true} className="h-4 w-4 accent-[#E4AD25]" />
            Active — appears in pickers
          </label>
          <p className="text-xs text-fg-3">
            Deactivating hides a value from new records; existing records keep it. Values are never deleted.
          </p>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={newTypeOpen} onClose={() => setNewTypeOpen(false)} title="Add lookup list">
        <form onSubmit={submitType} className="space-y-4">
          <Field label="Label" htmlFor="lt_label" hint="Shown in admin, e.g. “Referral partners”">
            <Input id="lt_label" name="label" required />
          </Field>
          <Field label="Key" htmlFor="lt_key" hint="Stable machine name, e.g. referral_partner">
            <Input id="lt_key" name="key" required pattern="[a-z][a-z0-9_]*" />
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setNewTypeOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
