"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { updateCampaignContent } from "../actions";

export function MessageEditor({
  campaignId,
  kind,
  subject,
  bodyHtml,
  editable,
}: {
  campaignId: string;
  kind: string;
  subject: string | null;
  bodyHtml: string | null;
  editable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [subjectDraft, setSubjectDraft] = React.useState(subject ?? "");
  const [bodyDraft, setBodyDraft] = React.useState(bodyHtml ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isLaunch = kind === "launch";

  function openEditor() {
    setSubjectDraft(subject ?? "");
    setBodyDraft(bodyHtml ?? "");
    setError(null);
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateCampaignContent({ id: campaignId, subject: subjectDraft, body_html: bodyDraft });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Message"
          action={
            editable ? (
              <Button variant="outline" size="sm" onClick={openEditor} className="gap-1.5">
                <Pencil size={13} /> Edit content
              </Button>
            ) : null
          }
        />
        <div className="p-5">
          <p className="mb-2 text-sm font-bold text-fg-1">{subject ?? "No subject"}</p>
          {isLaunch && bodyHtml ? (
            <iframe
              title="Email preview"
              srcDoc={bodyHtml}
              sandbox=""
              className="h-[520px] w-full rounded-md border border-line bg-surface-2"
            />
          ) : (
            <div className="whitespace-pre-wrap rounded-sm border border-line bg-surface-2 p-4 text-sm text-fg-2">
              {bodyHtml ?? "No body yet."}
            </div>
          )}
          {!editable ? (
            <p className="mt-3 text-xs text-fg-3">
              This has already started sending, so the content is locked — what's shown here is what recipients see.
            </p>
          ) : null}
        </div>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Edit content" wide>
        <div className="space-y-4">
          <p className="text-sm text-fg-2">
            Changes apply before this goes out — nothing has been sent yet, so it's safe to edit right up until
            send time.
          </p>
          <Field label="Subject" htmlFor="me_subject">
            <Input
              id="me_subject"
              value={subjectDraft}
              onChange={(e) => setSubjectDraft(e.target.value)}
              maxLength={300}
            />
          </Field>
          <Field label={isLaunch ? "Body (HTML)" : "Body"} htmlFor="me_body">
            <Textarea
              id="me_body"
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
          </Field>
          {isLaunch ? (
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Live preview</p>
              <iframe
                title="Live preview"
                srcDoc={bodyDraft}
                sandbox=""
                className="h-[420px] w-full rounded-md border border-line bg-surface-2"
              />
            </div>
          ) : null}
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy || !subjectDraft.trim() || !bodyDraft.trim()} onClick={() => void save()}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </>
  );
}
