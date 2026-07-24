"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Textarea } from "@/components/ui/primitives";
import { SlideOver } from "@/components/ui/slide-over";
import { DOCUMENT_MERGE_FIELDS } from "@/lib/documents/merge-fields";
import { deleteDocumentTemplate, saveDocumentTemplate } from "./actions";

type Template = {
  id: string;
  key: string | null;
  name: string;
  description: string | null;
  body_html: string;
  is_active: boolean;
};

/** Preview by swapping each {{merge.field}} for its example value. */
function preview(html: string): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*(?:\|([^}]*))?\}\}/g, (_m, key: string, fallback?: string) => {
    if (key === "signature") return "<em style='color:#888'>[signature]</em>";
    const f = DOCUMENT_MERGE_FIELDS.find((x) => x.key === key);
    return f ? `<span style="background:#FBEFCB">${f.example}</span>` : (fallback ?? `{{${key}}}`);
  });
}

export function DocumentTemplatesClient({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Template | "new" | null>(null);
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const current = editing === "new" ? null : editing;

  function open(t: Template | "new") {
    setEditing(t);
    setBody(t === "new" ? "" : t.body_html);
    setError(null);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await saveDocumentTemplate({
      id: current?.id,
      name: String(f.get("name")),
      description: String(f.get("description") ?? "") || null,
      body_html: body,
      is_active: f.get("is_active") === "on",
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  async function remove(t: Template) {
    if (!window.confirm(`Delete the "${t.name}" template?`)) return;
    const res = await deleteDocumentTemplate({ id: t.id });
    if (!res.ok) return window.alert(res.error);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-fg-1">Documents</h1>
          <p className="text-sm text-fg-3">Templates staff can generate, populate and send for signature from a record.</p>
        </div>
        <Button size="sm" onClick={() => open("new")} className="gap-1.5"><Plus size={14} /> New template</Button>
      </div>

      <Card>
        {templates.length === 0 ? (
          <EmptyState className="m-4" title="No templates yet" body="Add a document template with merge fields." />
        ) : (
          <ul className="divide-y divide-line">
            {templates.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-fg-1">{t.name}</span>
                    {!t.is_active ? <Badge tone="neutral">Inactive</Badge> : null}
                    {t.key ? <Badge tone="gold">Built-in</Badge> : null}
                  </div>
                  {t.description ? <p className="mt-0.5 text-xs text-fg-3">{t.description}</p> : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => open(t)} className="gap-1"><Pencil size={13} /> Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(t)} className="text-fg-4 hover:text-danger"><Trash2 size={14} /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SlideOver open={editing !== null} onClose={() => setEditing(null)} title={current ? "Edit template" : "New template"} width="xl">
        {editing ? (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Name" htmlFor="dt_name">
              <Input id="dt_name" name="name" defaultValue={current?.name ?? ""} required />
            </Field>
            <Field label="Description" htmlFor="dt_desc">
              <Input id="dt_desc" name="description" defaultValue={current?.description ?? ""} />
            </Field>
            <Field label="Body (HTML with merge fields)" htmlFor="dt_body" hint="Use {{merge.fields}} from the reference below">
              <Textarea id="dt_body" value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="font-mono text-xs" />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-fg-1">
              <input type="checkbox" name="is_active" defaultChecked={current?.is_active ?? true} className="h-4 w-4 accent-[#E4AD25]" />
              Active
            </label>

            <div className="rounded-md border border-line bg-surface-2 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-3">Merge fields</p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {DOCUMENT_MERGE_FIELDS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setBody((b) => `${b}{{${f.key}}}`)}
                    title={`Insert — e.g. ${f.example}`}
                    className="flex items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs hover:bg-surface-3"
                  >
                    <code className="text-gold-deep">{`{{${f.key}}}`}</code>
                    <span className="truncate text-fg-3">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-fg-3">Preview (example values)</p>
              <div className="max-h-80 overflow-auto rounded-md border border-line bg-white p-4" dangerouslySetInnerHTML={{ __html: preview(body) }} />
            </div>

            {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save template"}</Button>
            </div>
          </form>
        ) : null}
      </SlideOver>
    </div>
  );
}
