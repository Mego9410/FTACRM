"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button, Card, CardHeader, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import {
  deleteChecklistInstance,
  instantiateChecklist,
  toggleChecklistItem,
  updateChecklistItem,
} from "@/lib/actions/checklists";
import { formatDate } from "@/lib/utils";

type Item = {
  id: string;
  label: string;
  checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  note: string | null;
};

type Instance = {
  id: string;
  name: string;
  created_at: string;
  items: Item[];
};

const today = () => new Date().toISOString().slice(0, 10);

export function ChecklistCLient({
  instances,
  templates,
  link,
  path,
}: {
  instances: Instance[];
  templates: { id: string; name: string }[];
  link: { contact_id: string | null; practice_id: string | null; deal_id: string | null };
  path: string;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState<Item | null>(null);
  const [note, setNote] = React.useState("");
  const [doneOn, setDoneOn] = React.useState(today());
  const [saveBusy, setSaveBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function openEditor(item: Item) {
    setEditing(item);
    setNote(item.note ?? "");
    setDoneOn(item.checked_at ? item.checked_at.slice(0, 10) : today());
    setError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaveBusy(true);
    setError(null);
    const res = await updateChecklistItem({
      id: editing.id,
      note: note,
      // Only send a done date for items that are already marked done.
      done_on: editing.checked ? doneOn : undefined,
      path,
    });
    setSaveBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  async function addChecklist() {
    if (!templateId) return;
    setBusy(true);
    await instantiateChecklist({ template_id: templateId, ...link, path });
    setBusy(false);
    setTemplateId("");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-64" aria-label="Checklist template">
          <option value="">Choose a template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
        <Button size="sm" onClick={() => void addChecklist()} disabled={!templateId || busy}>
          Add checklist
        </Button>
      </div>

      {instances.length === 0 ? (
        <EmptyState title="No checklists" body="Add a checklist from a template to track this record's steps." />
      ) : (
        <div className="space-y-4">
          {instances.map((inst) => {
            const done = inst.items.filter((i) => i.checked).length;
            return (
              <Card key={inst.id}>
                <CardHeader
                  title={
                    <>
                      {inst.name}{" "}
                      <span className="ml-1 text-xs font-semibold text-fg-3">
                        {done} of {inst.items.length} checked
                      </span>
                    </>
                  }
                  action={
                    <button
                      type="button"
                      title="Delete checklist"
                      className="rounded p-1.5 text-fg-4 hover:bg-surface-3 hover:text-danger"
                      onClick={async () => {
                        if (!window.confirm(`Delete checklist “${inst.name}”?`)) return;
                        await deleteChecklistInstance({ id: inst.id, path });
                        router.refresh();
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  }
                />
                <ul className="p-2">
                  {inst.items.map((item) => (
                    <li key={item.id} className="group flex items-start gap-3 rounded-[10px] px-3 py-2 hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={async (e) => {
                          await toggleChecklistItem({ id: item.id, checked: e.target.checked, done_on: today(), path });
                          router.refresh();
                        }}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#E4AD25]"
                        aria-label={item.label}
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => openEditor(item)}
                          className={
                            item.checked
                              ? "text-left text-sm text-fg-3 line-through"
                              : "text-left text-sm font-medium text-fg-1"
                          }
                        >
                          {item.label}
                        </button>
                        {item.note ? (
                          <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-fg-3">{item.note}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.checked && item.checked_by ? (
                          <span className="text-xs text-fg-4">
                            {item.checked_by} · {formatDate(item.checked_at)}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          title="Edit note and date"
                          aria-label={`Edit ${item.label}`}
                          onClick={() => openEditor(item)}
                          className="rounded p-1.5 text-fg-4 opacity-0 transition-opacity hover:bg-surface-3 hover:text-fg-1 group-hover:opacity-100"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.label ?? ""}>
        <div className="space-y-4">
          <Field label="Note" htmlFor="cli_note">
            <Textarea
              id="cli_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Anything worth recording against this step…"
            />
          </Field>
          {editing?.checked ? (
            <Field label="Done on" htmlFor="cli_done" hint="Defaults to today">
              <Input id="cli_done" type="date" value={doneOn} onChange={(e) => setDoneOn(e.target.value)} />
            </Field>
          ) : (
            <p className="text-xs text-fg-3">Tick the item to record who did it and when.</p>
          )}
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => void saveEdit()} disabled={saveBusy}>
              {saveBusy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
