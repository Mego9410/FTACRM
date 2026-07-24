// Pure document rendering (client + server safe). Template body uses
// {{merge.fields}}; field values are HTML-escaped (newlines → <br>) so record
// data can't inject markup, while the trusted template markup passes through.
// The {{signature}} field renders to a slot that the signing step fills in.
// {{signature:key}} makes a named slot for a specific party (multi-party docs).

export const SIG_SLOT = "[[FTA_SIGNATURE_SLOT]]";

/** The sentinel for a signature slot. "" is the default {{signature}} slot. */
export function sigSlot(key: string): string {
  return key ? `[[FTA_SIG:${key}]]` : SIG_SLOT;
}

const NAMED_SLOT_RE = /\[\[FTA_SIG:([a-zA-Z0-9_.-]+)\]\]/g;
// Note: keys may contain ':' so a named signature slot like {{signature:seller}}
// is captured whole.
const TAG_RE = /\{\{\s*([a-zA-Z0-9_.:]+)\s*(?:\|([^}]*))?\}\}/g;
const SIG_TAG_RE = /\{\{\s*signature(?::([a-zA-Z0-9_.-]+))?\s*\}\}/g;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Human label for a slot key. "" = the sole signatory. */
const SLOT_LABELS: Record<string, string> = { "": "Signatory", seller: "Seller", buyer: "Purchaser" };
export function slotLabel(key: string): string {
  return SLOT_LABELS[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : "Signatory");
}

/** The signature slots a template declares, in document order (deduped). */
export function parseSignatureSlots(body: string): { slotKey: string; label: string }[] {
  const seen = new Set<string>();
  const out: { slotKey: string; label: string }[] = [];
  for (const m of body.matchAll(SIG_TAG_RE)) {
    const key = m[1] ?? "";
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ slotKey: key, label: slotLabel(key) });
  }
  return out;
}

/** Resolve merge fields against a flat map of dotted keys. Signature → slot. */
export function renderDocument(body: string, values: Record<string, string>): string {
  return body.replace(TAG_RE, (_m, key: string, fallback?: string) => {
    if (key === "signature") return SIG_SLOT;
    if (key.startsWith("signature:")) return sigSlot(key.slice("signature:".length));
    const raw = values[key];
    const out = raw === undefined || raw === "" ? (fallback?.trim() ?? "") : raw;
    return esc(out).replace(/\n/g, "<br>");
  });
}

/** Replace the (single, default) signature slot in a rendered document. */
export function applySignature(rendered: string, signatureHtml: string): string {
  return rendered.split(SIG_SLOT).join(signatureHtml);
}

/** Replace every signature slot (default + named) via a per-slot resolver. */
export function applySignatureSlots(rendered: string, resolve: (slotKey: string) => string): string {
  return rendered.replace(NAMED_SLOT_RE, (_m, key: string) => resolve(key)).split(SIG_SLOT).join(resolve(""));
}

/** The signed-signature block (typed name + date). */
export function signatureBlock(name: string, dateLabel: string): string {
  return (
    `<div style="margin:8px 0;">` +
    `<div style="font-family:'Segoe Script','Brush Script MT',cursive;font-size:26px;color:#1a1a1a;">${esc(name)}</div>` +
    `<div style="border-top:1px solid #1a1a1a;width:260px;margin-top:2px;padding-top:4px;font-size:12px;color:#555;">` +
    `${esc(name)} &nbsp;·&nbsp; Signed ${esc(dateLabel)}</div></div>`
  );
}

/** The unsigned placeholder shown before a slot is signed. */
export const SIGN_PENDING_HTML =
  `<div style="margin:8px 0;border:1px dashed #bbb;border-radius:6px;padding:14px 16px;color:#999;font-size:13px;">` +
  `Awaiting signature</div>`;

/** Unsigned placeholder naming which party the slot is waiting on. */
export function pendingSlotHtml(label: string): string {
  return (
    `<div style="margin:8px 0;border:1px dashed #bbb;border-radius:6px;padding:14px 16px;color:#999;font-size:13px;">` +
    `Awaiting signature — ${esc(label)}</div>`
  );
}

/** Signature slot as a non-editable block for the "edit before sending" editor. */
export const SIG_EDIT_PLACEHOLDER =
  `<div data-fta-sig="1" contenteditable="false" style="margin:8px 0;border:1px dashed #bbb;border-radius:6px;padding:14px 16px;color:#999;font-size:13px;">` +
  `Signature (added when signed)</div>`;

/** Turn a rendered document's signature slots into the editor's non-editable
 * placeholders (each carries its slot key so it can be restored). */
export function slotsToEditor(rendered: string): string {
  const editorBlock = (key: string) =>
    `<div data-fta-sig="1" data-sig-key="${esc(key)}" contenteditable="false" style="margin:8px 0;border:1px dashed #bbb;border-radius:6px;padding:14px 16px;color:#999;font-size:13px;">` +
    `Signature — ${esc(slotLabel(key))} (added when signed)</div>`;
  return rendered.replace(NAMED_SLOT_RE, (_m, key: string) => editorBlock(key)).split(SIG_SLOT).join(editorBlock(""));
}

/** Convert an edited document (with the editor's signature placeholders) back to
 * canonical signature slots; append a default one if the user deleted them all. */
export function normaliseEditedDocument(html: string): string {
  const replaced = html.replace(/<div[^>]*data-fta-sig="1"[^>]*>[\s\S]*?<\/div>/gi, (block) => {
    const keyMatch = block.match(/data-sig-key="([a-zA-Z0-9_.-]*)"/i);
    return sigSlot(keyMatch?.[1] ?? "");
  });
  return /\[\[FTA_SIG(?::[a-zA-Z0-9_.-]+)?\]\]|\[\[FTA_SIGNATURE_SLOT\]\]/.test(replaced)
    ? replaced
    : `${replaced}<div>${SIG_SLOT}</div>`;
}

/**
 * Light server-side sanitiser for staff-edited document HTML: strips scripts,
 * styles, event handlers and javascript: URLs. Templates are admin-authored, but
 * the generate step lets any staff member tweak the text, so defend the render.
 */
export function sanitizeDocumentHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}
