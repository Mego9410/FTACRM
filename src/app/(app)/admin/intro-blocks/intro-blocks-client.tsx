"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { deleteIntroBlock, reorderIntroBlocks, saveIntroBlock } from "./actions";

type Block = { id: string; label: string; body: string; is_active: boolean };

export function IntroBlocksClient({ blocks }: { blocks: Block[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Block | "new" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const current = editing === "new" ? null : editing;

  async function move(index: number, dir: -1 | 1) {
    const ids = blocks.map((b) => b.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j]!, ids[index]!];
    await reorderIntroBlocks({ ids });
    router.refresh();
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await saveIntroBlock({
      id: current?.id,
      label: String(f.get("label")),
      body: String(f.get("body")),
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
        title={`Intro email blocks (${blocks.length})`}
        action={<Button size="sm" onClick={() => setEditing("new")}>Add block</Button>}
      />
      <p className="border-b border-line px-5 py-3 text-sm text-fg-2">
        These are the tickable introductions agents can add to a buyer's follow-up email after a phone call —
        e.g. FTA Finance, the CQC registration contact, recommended solicitors. Order here is the order they're
        offered in the composer.
      </p>
      {blocks.length === 0 ? (
        <p className="px-5 py-6 text-sm text-fg-3">No blocks yet — add the first one.</p>
      ) : (
        <ul className="divide-y divide-line">
          {blocks.map((b, i) => (
            <li key={b.id} className="flex items-start justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-fg-1">
                  {b.label} {!b.is_active ? <Badge className="ml-1.5">Inactive</Badge> : null}
                </p>
                <p className="mt-0.5 text-xs text-fg-3">{b.body}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => void move(i, -1)} disabled={i === 0} className="rounded p-1 text-fg-3 hover:bg-surface-3 disabled:opacity-30" aria-label="Move up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => void move(i, 1)} disabled={i === blocks.length - 1} className="rounded p-1 text-fg-3 hover:bg-surface-3 disabled:opacity-30" aria-label="Move down">
                  <ArrowDown size={14} />
                </button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(b)}>Edit</Button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Remove "${b.label}"? Any past emails that used it keep their own copy of the text.`)) return;
                    await deleteIntroBlock({ id: b.id });
                    router.refresh();
                  }}
                  className="rounded p-1.5 text-fg-3 hover:bg-surface-3 hover:text-danger"
                  aria-label="Delete block"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={current ? `Edit ${current.label}` : "Add block"} wide>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Label (shown next to the tick box)" htmlFor="ib_label">
            <Input id="ib_label" name="label" defaultValue={current?.label} required maxLength={120} placeholder="e.g. FTA Finance" />
          </Field>
          <Field label="Text (inserted into the email when ticked)" htmlFor="ib_body">
            <Textarea
              id="ib_body"
              name="body"
              defaultValue={current?.body}
              required
              rows={4}
              placeholder="Write this as a natural paragraph — it's dropped straight into the email as-is."
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-fg-1">
            <input type="checkbox" name="is_active" defaultChecked={current?.is_active ?? true} className="h-4 w-4 accent-[#E4AD25]" />
            Active — offered in the composer
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
