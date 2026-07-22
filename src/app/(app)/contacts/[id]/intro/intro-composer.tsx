"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Mail, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { cn, formatDateTime } from "@/lib/utils";
import { assembleIntroBody, introSignOff, type IntroBlock } from "@/lib/email/intro-email";
import { sendIntroEmail } from "./actions";
import { deleteIntroBlockShared, saveIntroBlockShared } from "./blocks-actions";

type HistoryRow = {
  id: string;
  subject: string;
  body_text: string;
  block_labels: string[];
  sent_at: string;
  sentBy: string | null;
};

export function IntroComposer({
  contactId,
  firstName,
  email,
  doNotContact,
  senderName,
  blocks,
  history,
}: {
  contactId: string;
  firstName: string;
  email: string | null;
  doNotContact: boolean;
  senderName: string;
  blocks: IntroBlock[];
  history: HistoryRow[];
}) {
  const router = useRouter();
  const [subject, setSubject] = React.useState("Good to speak with you");
  const [topText, setTopText] = React.useState(
    `Hi ${firstName},\n\nIt was great speaking with you earlier — thank you for taking the time.`,
  );
  const [tailText, setTailText] = React.useState(
    "If anything comes up in the meantime, just reply to this email or give me a call.",
  );
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  // Per-email edits to a block's text — ephemeral, reverts to the template next time.
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [manageOpen, setManageOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const bodyFor = (b: IntroBlock) => edits[b.id] ?? b.body;
  const orderedSelected = blocks.filter((b) => selected.has(b.id));
  const signOff = introSignOff(senderName);
  const preview = assembleIntroBody(topText, orderedSelected.map(bodyFor), tailText, signOff);
  const canSend = Boolean(email) && !doNotContact;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send() {
    setBusy(true);
    setError(null);
    setSent(false);
    const res = await sendIntroEmail({
      contact_id: contactId,
      subject,
      top_text: topText,
      tail_text: tailText,
      blocks: orderedSelected.map((b) => ({ id: b.id, body: bodyFor(b) })),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSent(true);
    setSelected(new Set());
    setEdits({});
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_460px]">
      <div className="space-y-5">
        <Card className="border-l-2 border-l-gold bg-gold-tint/20">
          <div className="px-5 py-3.5 text-sm text-fg-2">
            A one-to-one follow-up after a phone call — plain, natural language, not the branded marketing
            template. Tick the introductions this buyer needs and top and tail it in your own words.
          </div>
        </Card>

        {!canSend ? (
          <div className="flex items-start gap-2.5 rounded-md border border-warn/40 bg-warn-bg px-4 py-3 text-sm font-semibold text-warn">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            {doNotContact
              ? "This contact is flagged do not contact — this can't be sent."
              : "This contact has no email address on file — add one on the Details tab first."}
          </div>
        ) : null}

        <Card>
          <CardHeader title="Subject" />
          <div className="p-5">
            <Field label="Subject line" htmlFor="ie_subject">
              <Input id="ie_subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={300} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Opening" />
          <div className="p-5">
            <Textarea value={topText} onChange={(e) => setTopText(e.target.value)} rows={4} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title={
              <>
                Introductions{" "}
                <span className="ml-1 text-xs font-semibold text-fg-3">{selected.size} of {blocks.length} added</span>
              </>
            }
            action={
              <Button variant="outline" size="sm" onClick={() => setManageOpen(true)} className="gap-1.5">
                <Pencil size={13} /> Edit
              </Button>
            }
          />
          {blocks.length === 0 ? (
            <p className="px-5 py-6 text-sm text-fg-3">
              No introduction blocks yet — use <span className="font-semibold">Edit</span> to add the first one.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {blocks.map((b) => {
                const isSelected = selected.has(b.id);
                return (
                  <li key={b.id} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(b.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#E4AD25]"
                        aria-label={b.label}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-fg-1">{b.label}</p>
                        {isSelected ? (
                          <>
                            <Textarea
                              value={bodyFor(b)}
                              onChange={(e) => setEdits((prev) => ({ ...prev, [b.id]: e.target.value }))}
                              rows={3}
                              className="mt-1.5 text-[13px]"
                            />
                            <p className="mt-1 text-[11px] text-fg-4">
                              Edited just for this email — the saved version isn't changed.
                            </p>
                          </>
                        ) : (
                          <p className="mt-0.5 text-xs text-fg-3">{b.body}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Closing" />
          <div className="space-y-3 p-5">
            <Textarea value={tailText} onChange={(e) => setTailText(e.target.value)} rows={3} />
            <div className="rounded-sm border border-line bg-surface-2 px-3 py-2 text-xs text-fg-3">
              Signed off automatically as:
              <span className="mt-1 block whitespace-pre-line font-semibold text-fg-2">{signOff}</span>
            </div>
          </div>
        </Card>

        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
        {sent ? <p className="text-sm font-medium text-available-fg">Sent.</p> : null}
        <div className="flex justify-end">
          <Button onClick={() => void send()} disabled={busy || !canSend || !preview.trim()}>
            <Mail size={14} /> {busy ? "Sending…" : "Send introduction email"}
          </Button>
        </div>

        {history.length > 0 ? (
          <Card>
            <CardHeader title={`Previously sent (${history.length})`} />
            <ul className="divide-y divide-line">
              {history.map((h) => {
                const isOpen = expanded.has(h.id);
                return (
                  <li key={h.id} className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(h.id)) next.delete(h.id);
                          else next.add(h.id);
                          return next;
                        })
                      }
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg-1">{h.subject}</p>
                        <p className="mt-0.5 text-xs text-fg-3">
                          {formatDateTime(h.sent_at)}
                          {h.sentBy ? ` · ${h.sentBy}` : ""}
                          {h.block_labels.length ? ` · ${h.block_labels.join(", ")}` : ""}
                        </p>
                      </div>
                      <ChevronDown size={16} className={cn("shrink-0 text-fg-3 transition-transform", isOpen && "rotate-180")} />
                    </button>
                    {isOpen ? (
                      <p className="mt-2.5 whitespace-pre-wrap rounded-sm border border-line bg-surface-2 p-3 text-sm text-fg-2">
                        {h.body_text}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}
      </div>

      <div className="min-w-0">
        <Card className="xl:sticky xl:top-20">
          <CardHeader title="Preview" />
          <div className="border-b border-line px-5 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-fg-3">Subject</p>
            <p className="mt-0.5 text-sm font-semibold text-fg-1">{subject || "No subject"}</p>
          </div>
          <div className="max-h-[560px] overflow-y-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-fg-2">
            {preview || "Start typing to see the email build up here."}
          </div>
        </Card>
      </div>

      <ManageBlocksDialog open={manageOpen} onClose={() => setManageOpen(false)} blocks={blocks} />
    </div>
  );
}

/** Add / edit / remove the shared introduction-block library — open to all users. */
function ManageBlocksDialog({
  open,
  onClose,
  blocks,
}: {
  open: boolean;
  onClose: () => void;
  blocks: IntroBlock[];
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<IntroBlock | "new" | null>(null);
  const [label, setLabel] = React.useState("");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const current = editing === "new" ? null : editing;

  function startNew() {
    setEditing("new");
    setLabel("");
    setBody("");
    setError(null);
  }
  function startEdit(b: IntroBlock) {
    setEditing(b);
    setLabel(b.label);
    setBody(b.body);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await saveIntroBlockShared({ id: current?.id, label, body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  async function remove(b: IntroBlock) {
    if (!window.confirm(`Remove "${b.label}"? Past emails keep their own copy of the text.`)) return;
    await deleteIntroBlockShared({ id: b.id });
    router.refresh();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Introduction blocks" wide>
      {editing ? (
        <div className="space-y-4">
          <Field label="Label (shown next to the tick box)" htmlFor="mb_label">
            <Input id="mb_label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} placeholder="e.g. FTA Finance" />
          </Field>
          <Field label="Text (inserted into the email when ticked)" htmlFor="mb_body">
            <Textarea id="mb_body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Write this as a natural paragraph." />
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Back</Button>
            <Button disabled={busy || !label.trim() || !body.trim()} onClick={() => void save()}>
              {busy ? "Saving…" : "Save block"}
            </Button>
          </DialogFooter>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-fg-3">These are shared by the whole team.</p>
            <Button size="sm" onClick={startNew}><Plus size={14} /> Add block</Button>
          </div>
          {blocks.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-3">No blocks yet — add the first one.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg-1">{b.label}</p>
                    <p className="mt-0.5 text-xs text-fg-3">{b.body}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(b)}>Edit</Button>
                    <button
                      type="button"
                      onClick={() => void remove(b)}
                      className="rounded p-1.5 text-fg-3 hover:bg-surface-3 hover:text-danger"
                      aria-label="Delete block"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  );
}
