// Pure document rendering (client + server safe). Template body uses
// {{merge.fields}}; field values are HTML-escaped (newlines → <br>) so record
// data can't inject markup, while the trusted template markup passes through.
// The {{signature}} field renders to a slot that the signing step fills in.

export const SIG_SLOT = "[[FTA_SIGNATURE_SLOT]]";

const TAG_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*(?:\|([^}]*))?\}\}/g;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Resolve merge fields against a flat map of dotted keys. Signature → SIG_SLOT. */
export function renderDocument(body: string, values: Record<string, string>): string {
  return body.replace(TAG_RE, (_m, key: string, fallback?: string) => {
    if (key === "signature") return SIG_SLOT;
    const raw = values[key];
    const out = raw === undefined || raw === "" ? (fallback?.trim() ?? "") : raw;
    return esc(out).replace(/\n/g, "<br>");
  });
}

/** Replace the signature slot in an already-rendered document. */
export function applySignature(rendered: string, signatureHtml: string): string {
  return rendered.split(SIG_SLOT).join(signatureHtml);
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

/** The unsigned placeholder shown to staff before it's signed. */
export const SIGN_PENDING_HTML =
  `<div style="margin:8px 0;border:1px dashed #bbb;border-radius:6px;padding:14px 16px;color:#999;font-size:13px;">` +
  `Awaiting signature</div>`;

/** Signature slot as a non-editable block for the "edit before sending" editor. */
export const SIG_EDIT_PLACEHOLDER =
  `<div data-fta-sig="1" contenteditable="false" style="margin:8px 0;border:1px dashed #bbb;border-radius:6px;padding:14px 16px;color:#999;font-size:13px;">` +
  `Signature (added when signed)</div>`;

/** Convert an edited document (with the editor's signature placeholder) back to
 * the canonical signature slot; append one if the user deleted it. */
export function normaliseEditedDocument(html: string): string {
  const replaced = html.replace(/<div[^>]*data-fta-sig="1"[^>]*>[\s\S]*?<\/div>/gi, SIG_SLOT);
  return replaced.includes(SIG_SLOT) ? replaced : `${replaced}<div>${SIG_SLOT}</div>`;
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
