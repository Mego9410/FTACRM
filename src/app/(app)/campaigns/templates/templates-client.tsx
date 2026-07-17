"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { saveTemplate } from "../actions";

type Template = {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  record_context: string;
  is_active: boolean;
};

export function TemplatesClient({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Template | "new" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const current = editing === "new" ? null : editing;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await saveTemplate({
      id: current?.id,
      name: String(f.get("name")),
      subject: String(f.get("subject")),
      body_html: String(f.get("body_html")),
      record_context: String(f.get("record_context")),
      is_active: f.get("is_active") === "on",
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title={`Templates (${templates.length})`}
        action={<Button size="sm" onClick={() => setEditing("new")}>Add template</Button>}
      />
      {templates.length === 0 ? (
        <EmptyState className="m-4" title="No templates yet" body="Save the emails you send repeatedly — new instruction alerts, price reductions, re-engagement." />
      ) : (
        <ul className="divide-y divide-line">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-fg-1">{t.name}</p>
                <p className="truncate text-xs text-fg-3">{t.subject}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge className="capitalize">{t.record_context}</Badge>
                {!t.is_active ? <Badge>Inactive</Badge> : null}
                <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>Edit</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={current ? `Edit ${current.name}` : "Add template"} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" htmlFor="tp_name">
              <Input id="tp_name" name="name" defaultValue={current?.name} required />
            </Field>
            <Field label="Context" htmlFor="tp_ctx" hint="Which merge tags make sense">
              <Select id="tp_ctx" name="record_context" defaultValue={current?.record_context ?? "buyer"}>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="practice">Practice</option>
                <option value="contact">General contact</option>
              </Select>
            </Field>
          </div>
          <Field label="Subject" htmlFor="tp_subject">
            <Input id="tp_subject" name="subject" defaultValue={current?.subject} required />
          </Field>
          <Field label="Body" htmlFor="tp_body" hint="Merge tags like {{contact.first_name|there}} and {{practice.display_title}}">
            <Textarea id="tp_body" name="body_html" defaultValue={current?.body_html} rows={10} required />
          </Field>
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
