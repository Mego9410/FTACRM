"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Copy, Eye, Download } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import {
  renderDocument,
  applySignature,
  normaliseEditedDocument,
  SIG_SLOT,
  SIG_EDIT_PLACEHOLDER,
  SIGN_PENDING_HTML,
} from "@/lib/documents/render";
import type { ResolvedField } from "@/lib/documents/context";
import type { SignatureRequestRow } from "@/lib/documents/signatures";
import { cancelSignatureRequest, getSignatureDocument, sendForSignature } from "@/lib/actions/signatures";
import { extractTags } from "@/lib/merge-tags";

type Template = { id: string; name: string; body_html: string };

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
  const [sName, setSName] = React.useState(signerName);
  const [sEmail, setSEmail] = React.useState(signerEmail);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sentUrl, setSentUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [viewing, setViewing] = React.useState<{ title: string; html: string } | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement | null>(null);

  const selected = templates.find((t) => t.id === templateId) ?? null;
  const previewHtml = selected
    ? applySignature(renderDocument(selected.body_html, values), SIGN_PENDING_HTML)
    : "";

  // Only show the merge fields the chosen template actually uses, so each
  // document's form stays focused rather than listing every possible field.
  const visibleFields = React.useMemo(() => {
    if (!selected) return fields;
    const used = new Set(extractTags(selected.body_html));
    return fields.filter((f) => used.has(f.key));
  }, [selected, fields]);

  // Seed the editable document from the current template + field values whenever
  // the user switches into "edit text" mode.
  React.useEffect(() => {
    if (editMode && editorRef.current && selected) {
      editorRef.current.innerHTML = renderDocument(selected.body_html, values).split(SIG_SLOT).join(SIG_EDIT_PLACEHOLDER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  function openGen() {
    setSentUrl(null);
    setError(null);
    setCopied(false);
    setEditMode(false);
    setGenOpen(true);
  }

  async function send() {
    if (!selected) return;
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
      signer_name: sName,
      signer_email: sEmail,
      path,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSentUrl((res.data as { url: string }).url);
    router.refresh();
  }

  async function view(id: string) {
    const res = await getSignatureDocument({ id });
    if (!res.ok) return window.alert(res.error);
    const d = res.data as { title: string; html: string };
    setViewing({ title: d.title, html: d.html });
  }

  // Open the signed copy as a printable A4 page so the user can save it as a
  // PDF (or print it). The document is self-contained — no external assets.
  async function download(id: string) {
    const res = await getSignatureDocument({ id });
    if (!res.ok) return window.alert(res.error);
    const d = res.data as { title: string; html: string };
    const win = window.open("", "_blank");
    if (!win) {
      window.alert("Please allow pop-ups to download the signed document.");
      return;
    }
    const safeTitle = d.title.replace(/[<>&"]/g, (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] ?? c,
    );
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
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-fg-1">{r.title}</span>
                  <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                </div>
                <p className="text-xs text-fg-3">
                  {r.signer_name} · {r.status === "signed" && r.signed_at ? `signed ${formatDate(r.signed_at)}` : formatDate(r.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => view(r.id)} className="gap-1"><Eye size={13} /> View</Button>
                {r.status === "signed" ? (
                  <Button variant="ghost" size="sm" onClick={() => download(r.id)} className="gap-1"><Download size={13} /> Download</Button>
                ) : null}
                {r.status === "sent" || r.status === "viewed" ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(`${window.location.origin}/sign/${r.token}`);
                      }}
                      className="gap-1"
                    >
                      <Copy size={13} /> Link
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => cancel(r.id)} className="text-fg-4 hover:text-danger">Cancel</Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Generate dialog */}
      <Dialog open={genOpen} onClose={() => setGenOpen(false)} title="Generate document" wide>
        {sentUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-fg-2">
              Document created and ready to sign. Send this secure link to <span className="font-semibold text-fg-1">{sName}</span>:
            </p>
            <div className="flex items-center gap-2 rounded-md border border-line bg-surface-2 p-2">
              <code className="min-w-0 flex-1 truncate text-xs text-fg-2">{sentUrl}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(sentUrl);
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
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
              <div className="max-h-64 space-y-2 overflow-auto pr-1">
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
              <div className="grid grid-cols-1 gap-2 border-t border-line pt-3">
                <Field label="Signer name" htmlFor="gd_sn">
                  <Input id="gd_sn" value={sName} onChange={(e) => setSName(e.target.value)} required />
                </Field>
                <Field label="Signer email" htmlFor="gd_se">
                  <Input id="gd_se" type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} required />
                </Field>
              </div>
              {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setGenOpen(false)}>Cancel</Button>
                <Button type="button" onClick={send} disabled={busy || !sName || !sEmail || !selected}>
                  {busy ? "Creating…" : "Send for signature"}
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
              {editMode ? <p className="mt-1 text-[11px] text-fg-4">Edit the wording as needed. The signature box stays where it is.</p> : null}
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
