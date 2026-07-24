"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Copy, Eye, Download } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import {
  renderDocument,
  applySignatureSlots,
  pendingSlotHtml,
  slotLabel,
  parseSignatureSlots,
  slotsToEditor,
  normaliseEditedDocument,
} from "@/lib/documents/render";
import type { ResolvedField } from "@/lib/documents/context";
import type { SignatureRequestRow, SignerSummary } from "@/lib/documents/signatures";
import { cancelSignatureRequest, getSignatureDocument, sendForSignature } from "@/lib/actions/signatures";
import { extractTags } from "@/lib/merge-tags";

type Template = { id: string; name: string; body_html: string };
type SignerDraft = { slot_key: string; party_label: string; signer_name: string; signer_email: string };

const STATUS_TONE: Record<string, "warn" | "green" | "danger" | "neutral" | "gold"> = {
  draft: "neutral",
  sent: "gold",
  viewed: "warn",
  signed: "green",
  declined: "danger",
  cancelled: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
  cancelled: "Cancelled",
};

function signerLine(s: SignerSummary): string {
  if (s.status === "signed") return `${s.party_label}: signed${s.signed_at ? ` ${formatDate(s.signed_at)}` : ""}`;
  if (s.status === "viewed") return `${s.party_label}: viewed`;
  if (s.status === "declined") return `${s.party_label}: declined`;
  return `${s.party_label}: awaiting`;
}

export function RecordDocuments({
  templates,
  fields,
  signerName,
  signerEmail,
  requests,
  link,
  path,
}: {
  templates: Template[];
  fields: ResolvedField[];
  signerName: string;
  signerEmail: string;
  requests: SignatureRequestRow[];
  link: { practiceId?: string; contactId?: string; dealId?: string };
  path: string;
}) {
  const router = useRouter();
  const [genOpen, setGenOpen] = React.useState(false);
  const [templateId, setTemplateId] = React.useState(templates[0]?.id ?? "");
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.value])),
  );
  const [signers, setSigners] = React.useState<SignerDraft[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sentLinks, setSentLinks] = React.useState<{ party_label: string; url: string }[] | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const [viewing, setViewing] = React.useState<{ title: string; html: string } | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement | null>(null);

  const selected = templates.find((t) => t.id === templateId) ?? null;

  // Which signature slots this template declares (1 for most, 2 for Heads of Agreement).
  const slots = React.useMemo(() => (selected ? parseSignatureSlots(selected.body_html) : []), [selected]);

  // Reset the signer list to match the chosen template's slots. Seed the
  // seller/sole signatory from the record; leave the buyer for staff to fill.
  React.useEffect(() => {
    setSigners(
      slots.map((s) => {
        const prefill = s.slotKey === "" || s.slotKey === "seller";
        return {
          slot_key: s.slotKey,
          party_label: s.label,
          signer_name: prefill ? signerName : "",
          signer_email: prefill ? signerEmail : "",
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const previewHtml = selected
    ? applySignatureSlots(renderDocument(selected.body_html, values), (k) => pendingSlotHtml(slotLabel(k)))
    : "";

  const visibleFields = React.useMemo(() => {
    if (!selected) return fields;
    const used = new Set(extractTags(selected.body_html));
    return fields.filter((f) => used.has(f.key));
  }, [selected, fields]);

  // Seed the editable document from the current template + field values when the
  // user switches into "edit text" mode.
  React.useEffect(() => {
    if (editMode && editorRef.current && selected) {
      editorRef.current.innerHTML = slotsToEditor(renderDocument(selected.body_html, values));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  function openGen() {
    setSentLinks(null);
    setError(null);
    setCopied(null);
    setEditMode(false);
    setGenOpen(true);
  }

  function setSigner(i: number, patch: Partial<SignerDraft>) {
    setSigners((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  const canSend = selected && signers.length > 0 && signers.every((s) => s.signer_name.trim() && s.signer_email.trim());

  async function send() {
    if (!selected || !canSend) return;
    setBusy(true);
    setError(null);
    const res = await sendForSignature({
      template_id: selected.id,
      title: selected.name,
      practice_id: link.practiceId ?? null,
      contact_id: link.contactId ?? null,
      deal_id: link.dealId ?? null,
      values,
      body_html: editMode && editorRef.current ? normaliseEditedDocument(editorRef.current.innerHTML) : undefined,
      signers: signers.map((s) => ({
        slot_key: s.slot_key,
        party_label: s.party_label,
        signer_name: s.signer_name,
        signer_email: s.signer_email,
      })),
      path,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSentLinks((res.data as { signers: { party_label: string; url: string }[] }).signers);
    router.refresh();
  }

  async function view(id: string) {
    const res = await getSignatureDocument({ id });
    if (!res.ok) return window.alert(res.error);
    const d = res.data as { title: string; html: string };
    setViewing({ title: d.title, html: d.html });
  }

  // Open the fully-signed copy as a printable A4 page (save as PDF / print).
  async function download(id: string) {
    const res = await getSignatureDocument({ id });
    if (!res.ok) return window.alert(res.error);
    const d = res.data as { title: string; html: string };
    const win = window.open("", "_blank");
    if (!win) {
      window.alert("Please allow pop-ups to download the signed document.");
      return;
    }
    const safeTitle = d.title.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] ?? c);
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>` +
        `<style>@page{size:A4;margin:22mm}*{box-sizing:border-box}` +
        `body{font-family:'Hanken Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif;color:#1a1a1a;font-size:13.5px;line-height:1.65;margin:0}` +
        `h1,h2,h3{color:#111}p{margin:0 0 10px}</style></head>` +
        `<body>${d.html}</body></html>`,
    );
    win.document.close();
    win.focus();
    setTimeout(() => {
      try {
        win.print();
      } catch {
        /* user can print manually */
      }
    }, 350);
  }

  async function cancel(id: string) {
    if (!window.confirm("Cancel this signature request?")) return;
    const res = await cancelSignatureRequest({ id, path });
    if (!res.ok) return window.alert(res.error);
    router.refresh();
  }

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }

  return (
    <Card>
      <CardHeader
        title="Documents for signature"
        action={
          templates.length ? (
            <Button size="sm" onClick={openGen} className="gap-1.5">
              <FileSignature size={14} /> Generate document
            </Button>
          ) : null
        }
      />
      {requests.length === 0 ? (
        <EmptyState
          className="m-4"
          title="No documents yet"
          body={templates.length ? "Generate a document to populate and send it for signature." : "No templates configured yet."}
        />
      ) : (
        <ul className="divide-y divide-line">
          {requests.map((r) => {
            const active = r.status === "sent" || r.status === "viewed";
            return (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-fg-1">{r.title}</span>
                    <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                  </div>
                  {r.signers.length > 0 ? (
                    <p className="mt-0.5 text-xs text-fg-3">{r.signers.map(signerLine).join("  ·  ")}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-fg-3">{formatDate(r.created_at)}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => view(r.id)} className="gap-1"><Eye size={13} /> View</Button>
                  {r.status === "signed" ? (
                    <Button variant="ghost" size="sm" onClick={() => download(r.id)} className="gap-1"><Download size={13} /> Download</Button>
                  ) : null}
                  {active
                    ? r.signers
                        .filter((s) => s.status !== "signed")
                        .map((s) => (
                          <Button
                            key={s.token}
                            variant="ghost"
                            size="sm"
                            onClick={() => copy(`${window.location.origin}/sign/${s.token}`, `${r.id}-${s.token}`)}
                            className="gap-1"
                          >
                            <Copy size={13} /> {copied === `${r.id}-${s.token}` ? "Copied" : `${s.party_label} link`}
                          </Button>
                        ))
                    : null}
                  {active ? (
                    <Button variant="ghost" size="sm" onClick={() => cancel(r.id)} className="text-fg-4 hover:text-danger">Cancel</Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Generate dialog */}
      <Dialog open={genOpen} onClose={() => setGenOpen(false)} title="Generate document" wide>
        {sentLinks ? (
          <div className="space-y-4">
            <p className="text-sm text-fg-2">
              Document created. Send each party their secure signing link — they can see each other&apos;s progress as it&apos;s signed.
            </p>
            <div className="space-y-2">
              {sentLinks.map((s, i) => (
                <div key={i} className="rounded-md border border-line bg-surface-2 p-2">
                  <p className="mb-1 text-xs font-semibold text-fg-2">{s.party_label}</p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate text-xs text-fg-2">{s.url}</code>
                    <Button variant="outline" size="sm" onClick={() => copy(s.url, `link-${i}`)}>
                      {copied === `link-${i}` ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setGenOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label="Template" htmlFor="gd_tpl">
                <select
                  id="gd_tpl"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Field>
              <div className="max-h-56 space-y-2 overflow-auto pr-1">
                {visibleFields.map((f) => (
                  <Field key={f.key} label={f.label} htmlFor={`gd_${f.key}`}>
                    <Input
                      id={`gd_${f.key}`}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    />
                  </Field>
                ))}
              </div>
              <div className="space-y-3 border-t border-line pt-3">
                {signers.map((s, i) => (
                  <div key={s.slot_key || i} className="space-y-2">
                    {signers.length > 1 ? (
                      <p className="text-xs font-bold uppercase tracking-wide text-fg-3">{s.party_label}</p>
                    ) : null}
                    <Field label={`${signers.length > 1 ? "" : "Signer "}Name`.trim()} htmlFor={`gd_sn_${i}`}>
                      <Input id={`gd_sn_${i}`} value={s.signer_name} onChange={(e) => setSigner(i, { signer_name: e.target.value })} required />
                    </Field>
                    <Field label="Email" htmlFor={`gd_se_${i}`}>
                      <Input id={`gd_se_${i}`} type="email" value={s.signer_email} onChange={(e) => setSigner(i, { signer_email: e.target.value })} required />
                    </Field>
                  </div>
                ))}
              </div>
              {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setGenOpen(false)}>Cancel</Button>
                <Button type="button" onClick={send} disabled={busy || !canSend}>
                  {busy ? "Creating…" : signers.length > 1 ? "Send to both parties" : "Send for signature"}
                </Button>
              </DialogFooter>
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-fg-3">{editMode ? "Edit document" : "Preview"}</p>
                <button
                  type="button"
                  onClick={() => setEditMode((v) => !v)}
                  className="text-xs font-semibold text-gold-deep hover:underline"
                >
                  {editMode ? "Done editing" : "Edit text"}
                </button>
              </div>
              {editMode ? (
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="max-h-[520px] overflow-auto rounded-md border border-gold bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-gold/40"
                />
              ) : (
                <div className="max-h-[520px] overflow-auto rounded-md border border-line bg-white p-4" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              )}
              {editMode ? <p className="mt-1 text-[11px] text-fg-4">Edit the wording as needed. The signature boxes stay where they are.</p> : null}
            </div>
          </div>
        )}
      </Dialog>

      {/* View a generated/signed document */}
      <Dialog open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title ?? "Document"} wide>
        {viewing ? (
          <div className="space-y-3">
            <div className="max-h-[70vh] overflow-auto rounded-md border border-line bg-white p-5" dangerouslySetInnerHTML={{ __html: viewing.html }} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setViewing(null)}>Close</Button>
            </DialogFooter>
          </div>
        ) : null}
      </Dialog>
    </Card>
  );
}
