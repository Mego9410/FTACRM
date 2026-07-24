"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { systemJournal } from "@/lib/actions/journal";
import { notify } from "@/lib/notify";
import {
  renderDocument,
  applySignatureSlots,
  signatureBlock,
  pendingSlotHtml,
  sanitizeDocumentHtml,
  normaliseEditedDocument,
  slotLabel,
} from "@/lib/documents/render";
import { longDate } from "@/lib/documents/context";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

type SignerRow = {
  id: string;
  slot_key: string;
  party_label: string;
  signer_name: string;
  signer_email: string;
  token: string;
  status: "sent" | "viewed" | "signed" | "declined";
  signature_name: string | null;
  signed_at: string | null;
  viewed_at: string | null;
  sign_order: number;
};

const newToken = () => randomBytes(24).toString("base64url");
const recordLink = (r: { practice_id?: string | null; contact_id?: string | null; deal_id?: string | null }) =>
  r.practice_id
    ? `/practices/${r.practice_id}/documents`
    : r.contact_id
      ? `/contacts/${r.contact_id}/documents`
      : r.deal_id
        ? `/deals/${r.deal_id}`
        : "/dashboard";

/** Fill each signature slot from its signer: signed → block, else pending. */
function renderForDisplay(body: string, signers: SignerRow[]): string {
  const bySlot = new Map(signers.map((s) => [s.slot_key, s]));
  return applySignatureSlots(body, (slotKey) => {
    const s = bySlot.get(slotKey);
    if (s?.status === "signed") {
      return signatureBlock(s.signature_name ?? s.signer_name, s.signed_at ? longDate(new Date(s.signed_at)) : longDate());
    }
    return pendingSlotHtml(s ? s.party_label : slotLabel(slotKey));
  });
}

const signerInput = z.object({
  slot_key: z.string().max(40),
  party_label: z.string().trim().min(1).max(60),
  signer_name: z.string().trim().min(1).max(200),
  signer_email: z.string().email(),
});

const sendSchema = z.object({
  template_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  practice_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  values: z.record(z.string(), z.string()),
  body_html: z.string().max(200000).optional(), // set when the user edited the text
  signers: z.array(signerInput).min(1).max(6),
  path: z.string().optional(),
});

/**
 * Generate a populated document and create a signature request with one signer
 * per party (each gets its own secure link). Returns a link per signer.
 */
export async function sendForSignature(
  input: unknown,
): Promise<ActionResult<{ requestId: string; signers: { party_label: string; url: string }[] }>> {
  const me = await requireProfile();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.");
  const supabase = await createClient();

  // Use the user's edited text if they tweaked it; otherwise render from the
  // template + field values. Signature slots are guaranteed present either way.
  let body: string;
  if (parsed.data.body_html && parsed.data.body_html.trim()) {
    const clean = sanitizeDocumentHtml(parsed.data.body_html);
    body = /\[\[FTA_SIG/.test(clean) ? clean : normaliseEditedDocument(clean);
  } else {
    const { data: tpl } = await supabase
      .from("document_templates")
      .select("body_html")
      .eq("id", parsed.data.template_id)
      .maybeSingle();
    if (!tpl) return fail("Template not found.");
    body = renderDocument(tpl.body_html, parsed.data.values);
  }

  const { data: reqRow, error } = await supabase
    .from("signature_requests")
    .insert({
      template_id: parsed.data.template_id,
      title: parsed.data.title,
      body_html: body,
      practice_id: parsed.data.practice_id ?? null,
      contact_id: parsed.data.contact_id ?? null,
      deal_id: parsed.data.deal_id ?? null,
      signer_name: parsed.data.signers[0]?.signer_name ?? null,
      signer_email: parsed.data.signers[0]?.signer_email ?? null,
      token: null,
      status: "sent",
      sent_at: new Date().toISOString(),
      created_by: me.id,
    })
    .select("id")
    .single();
  if (error || !reqRow) return dbFail(error ?? new Error("Could not create the request."));

  const signerRows = parsed.data.signers.map((s, i) => ({
    request_id: reqRow.id,
    slot_key: s.slot_key,
    party_label: s.party_label,
    signer_name: s.signer_name,
    signer_email: s.signer_email,
    token: newToken(),
    sign_order: i,
    status: "sent" as const,
  }));
  const { error: signerErr } = await supabase.from("signature_signers").insert(signerRows);
  if (signerErr) return dbFail(signerErr);

  if (parsed.data.practice_id || parsed.data.contact_id || parsed.data.deal_id) {
    const who = parsed.data.signers.map((s) => s.signer_name).join(" and ");
    await systemJournal(
      {
        practice_id: parsed.data.practice_id ?? undefined,
        contact_id: parsed.data.contact_id ?? undefined,
        deal_id: parsed.data.deal_id ?? undefined,
      },
      `${parsed.data.title} sent to ${who} for signature.`,
    );
  }
  if (parsed.data.path) revalidatePath(parsed.data.path);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return ok({
    requestId: reqRow.id,
    signers: signerRows.map((s) => ({ party_label: s.party_label, url: `${base}/sign/${s.token}` })),
  });
}

/** Staff-side: the rendered document (with any signatures so far) for viewing. */
export async function getSignatureDocument(
  input: unknown,
): Promise<ActionResult<{ title: string; html: string; status: string }>> {
  await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("signature_requests")
    .select("title, body_html, status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!req) return fail("Not found.");
  const { data: signers } = await supabase
    .from("signature_signers")
    .select("id, slot_key, party_label, signer_name, signer_email, token, status, signature_name, signed_at, viewed_at, sign_order")
    .eq("request_id", parsed.data.id)
    .order("sign_order");
  return ok({ title: req.title, html: renderForDisplay(req.body_html, (signers ?? []) as SignerRow[]), status: req.status });
}

export async function cancelSignatureRequest(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z.object({ id: z.string().uuid(), path: z.string().optional() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("signature_requests")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.id)
    .in("status", ["draft", "sent", "viewed"]);
  if (error) return dbFail(error);
  if (parsed.data.path) revalidatePath(parsed.data.path);
  return ok();
}

export type SignerPublic = {
  party_label: string;
  status: SignerRow["status"];
  signed_at: string | null;
  isYou: boolean;
};
export type SignerView = {
  title: string;
  status: string;
  documentHtml: string;
  signers: SignerPublic[];
  me: { party_label: string; signer_name: string; status: SignerRow["status"] } | null;
  allSigned: boolean;
};

/** Public: everything the signing page needs for a given signer token. */
export async function getSignerView(input: unknown): Promise<ActionResult<SignerView>> {
  const parsed = z.object({ token: z.string().min(10) }).safeParse(input);
  if (!parsed.success) return fail("Invalid link.");
  const admin = createAdminClient();

  const { data: signer } = await admin
    .from("signature_signers")
    .select("id, request_id, party_label, signer_name, status")
    .eq("token", parsed.data.token)
    .maybeSingle();
  if (!signer) return fail("This signing link is invalid or has expired.");

  const { data: req } = await admin
    .from("signature_requests")
    .select("title, body_html, status")
    .eq("id", signer.request_id)
    .maybeSingle();
  if (!req) return fail("This document is no longer available.");

  // First open marks this signer as viewed.
  if (signer.status === "sent") {
    await admin
      .from("signature_signers")
      .update({ status: "viewed", viewed_at: new Date().toISOString() })
      .eq("id", signer.id)
      .eq("status", "sent");
  }

  const { data: signers } = await admin
    .from("signature_signers")
    .select("id, slot_key, party_label, signer_name, signer_email, token, status, signature_name, signed_at, viewed_at, sign_order")
    .eq("request_id", signer.request_id)
    .order("sign_order");
  const rows = (signers ?? []) as SignerRow[];
  const me = rows.find((s) => s.token === parsed.data.token) ?? null;

  return ok({
    title: req.title,
    status: req.status,
    documentHtml: renderForDisplay(req.body_html, rows),
    signers: rows.map((s) => ({
      party_label: s.party_label,
      status: s.token === parsed.data.token ? me?.status ?? s.status : s.status,
      signed_at: s.signed_at,
      isYou: s.token === parsed.data.token,
    })),
    me: me ? { party_label: me.party_label, signer_name: me.signer_name, status: me.status } : null,
    allSigned: rows.length > 0 && rows.every((s) => s.status === "signed"),
  });
}

const signSchema = z.object({ token: z.string().min(10), signer_name: z.string().trim().min(2).max(200) });

/** Public: a signer submits their typed signature. Uses the service role. */
export async function submitSignature(input: unknown): Promise<ActionResult> {
  const parsed = signSchema.safeParse(input);
  if (!parsed.success) return fail("Enter your full name to sign.");
  const admin = createAdminClient();

  const { data: signer } = await admin
    .from("signature_signers")
    .select("id, request_id, party_label, status")
    .eq("token", parsed.data.token)
    .maybeSingle();
  if (!signer) return fail("This signing link is invalid.");
  if (signer.status === "signed") return fail("You have already signed this document.");

  const { data: req } = await admin
    .from("signature_requests")
    .select("id, status, title, practice_id, contact_id, deal_id, created_by")
    .eq("id", signer.request_id)
    .maybeSingle();
  if (!req) return fail("This document is no longer available.");
  if (["cancelled", "declined"].includes(req.status)) return fail("This document is no longer active.");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const now = new Date().toISOString();

  const { error } = await admin
    .from("signature_signers")
    .update({ status: "signed", signature_name: parsed.data.signer_name, signed_at: now, viewed_at: now, signer_ip: ip })
    .eq("id", signer.id)
    .neq("status", "signed");
  if (error) return dbFail(error);

  // Recompute completion across all signers.
  const { data: all } = await admin.from("signature_signers").select("status").eq("request_id", req.id);
  const remaining = (all ?? []).filter((s) => s.status !== "signed").length;
  const link = recordLink(req);

  if (remaining === 0) {
    await admin.from("signature_requests").update({ status: "signed", signed_at: now }).eq("id", req.id);
    await systemJournal(
      { practice_id: req.practice_id ?? undefined, contact_id: req.contact_id ?? undefined, deal_id: req.deal_id ?? undefined },
      `${req.title} fully signed by all parties.`,
    );
    if (req.created_by) {
      await notify(req.created_by, { kind: "document_signed", title: "Document fully signed", body: `${req.title} — signed by all parties.`, link_url: link });
    }
  } else {
    await admin
      .from("signature_requests")
      .update({ status: "viewed" })
      .eq("id", req.id)
      .in("status", ["sent", "draft"]);
    await systemJournal(
      { practice_id: req.practice_id ?? undefined, contact_id: req.contact_id ?? undefined, deal_id: req.deal_id ?? undefined },
      `${req.title} signed by ${parsed.data.signer_name} (${signer.party_label}). ${remaining} signature(s) outstanding.`,
    );
    if (req.created_by) {
      await notify(req.created_by, {
        kind: "document_signed",
        title: "Document signed",
        body: `${req.title} — signed by ${parsed.data.signer_name} (${signer.party_label}). ${remaining} outstanding.`,
        link_url: link,
      });
    }
  }
  return ok();
}
