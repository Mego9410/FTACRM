"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button, Card, CardHeader, EmptyState, Select } from "@/components/ui/primitives";
import { deleteChecklistInstance, instantiateChecklist, toggleChecklistItem } from "@/lib/actions/checklists";
import { formatDate } from "@/lib/utils";

type Instance = {
  id: string;
  name: string;
  created_at: string;
  items: { id: string; label: string; checked: boolean; checked_at: string | null; checked_by: string | null }[];
};

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
                    <li key={item.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 hover:bg-surface-2">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={async (e) => {
                            await toggleChecklistItem({ id: item.id, checked: e.target.checked, path });
                            router.refresh();
                          }}
                          className="h-4 w-4 accent-[#E4AD25]"
                        />
                        <span className={item.checked ? "text-sm text-fg-3 line-through" : "text-sm font-medium text-fg-1"}>
                          {item.label}
                        </span>
                        {item.checked && item.checked_by ? (
                          <span className="ml-auto text-xs text-fg-4">
                            {item.checked_by} · {formatDate(item.checked_at)}
                          </span>
                        ) : null}
                      </label>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
