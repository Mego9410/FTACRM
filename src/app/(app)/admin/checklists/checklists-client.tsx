"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { saveChecklistTemplate } from "./actions";

type Template = {
  id: string;
  name: string;
  applies_to: string;
  is_active: boolean;
  items: { id: string; label: string }[];
};

export function ChecklistsClient({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Template | "new" | null>(null);
  const [labels, setLabels] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const current = editing === "new" ? null : editing;

  React.useEffect(() => {
    if (editing === "new") setLabels([""]);
    else if (editing) setLabels(editing.items.map((i) => i.label));
  }, [editing]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await saveChecklistTemplate({
      id: current?.id,
      name: String(f.get("name")),
      applies_to: String(f.get("applies_to")),
      is_active: f.get("is_active") === "on",
      items: labels.filter((l) => l.trim()).map((label) => ({ label: label.trim() })),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title={`Checklist templates (${templates.length})`}
        action={<Button size="sm" onClick={() => setEditing("new")}>Add template</Button>}
      />
      <ul>
        {templates.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-0 hover:bg-surface-2/60">
            <div>
              <p className="font-semibold text-fg-1">{t.name}</p>
              <p className="text-xs text-fg-3">
                Applies to {t.applies_to}s · {t.items.length} items
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!t.is_active ? <Badge>Inactive</Badge> : null}
              <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>Edit</Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={current ? `Edit ${current.name}` : "Add template"} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" htmlFor="ct_name">
              <Input id="ct_name" name="name" defaultValue={current?.name} required />
            </Field>
            <Field label="Applies to" htmlFor="ct_applies">
              <Select id="ct_applies" name="applies_to" defaultValue={current?.applies_to ?? "practice"}>
                <option value="contact">Contacts</option>
                <option value="practice">Practices</option>
                <option value="deal">Deals</option>
                <option value="valuation">Valuations</option>
              </Select>
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Items</p>
            <div className="space-y-2">
              {labels.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={label}
                    onChange={(e) => setLabels((ls) => ls.map((l, j) => (j === i ? e.target.value : l)))}
                    placeholder={`Item ${i + 1}`}
                  />
                  <button type="button" onClick={() => setLabels((ls) => ls.filter((_, j) => j !== i))} className="rounded p-2 text-fg-3 hover:bg-surface-3 hover:text-danger" aria-label="Remove item">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setLabels((ls) => [...ls, ""])}>
              <Plus size={14} /> Add item
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-fg-1">
            <input type="checkbox" name="is_active" defaultChecked={current?.is_active ?? true} className="h-4 w-4 accent-[#E4AD25]" />
            Active
          </label>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </Card>
  );
}
