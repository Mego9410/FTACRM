"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { systemJournal } from "@/lib/actions/journal";
import { renderDocument, applySignature, signatureBlock, SIGN_PENDING_HTML } from "@/lib/documents/render";
import { longDate } from "@/lib/documents/context";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const sendSchema = z.object({
  template_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  practice_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  values: z.record(z.string(), z.string()),
  signer_name: z.string().trim().min(1).max(200),
  signer_email: z.string().email(),
  path: z.string().optional(),
});

/** Generate a populated document and create a signature request (link to share). */
export async function sendForSignature(input: unknown): Promise<ActionResult<{ token: string; url: string }>> {
  const me = await requireProfile();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.");
  const supabase = await createClient();

  const { data: tpl } = await supabase
    .from("document_templates")
    .select("body_html")
    .eq("id", parsed.data.template_id)
    .maybeSingle();
  if (!tpl) return fail("Template not found.");

  const body = renderDocument(tpl.body_html, parsed.data.values);
  const token = randomBytes(24).toString("base64url");

  const { error } = await supabase.from("signature_requests").insert({
    template_id: parsed.data.template_id,
    title: parsed.data.title,
    body_html: body,
    practice_id: parsed.data.practice_id ?? null,
    contact_id: parsed.data.contact_id ?? null,
    deal_id: parsed.data.deal_id ?? null,
    signer_name: parsed.data.signer_name,
    signer_email: parsed.data.signer_email,
    token,
    status: "sent",
    sent_at: new Date().toISOString(),
    created_by: me.id,
  });
  if (error) return dbFail(error);

  if (parsed.data.practice_id || parsed.data.contact_id || parsed.data.deal_id) {
    await systemJournal(
      { practice_id: parsed.data.practice_id ?? undefined, contact_id: parsed.data.contact_id ?? undefined, deal_id: parsed.data.deal_id ?? undefined },
      `${parsed.data.title} sent to ${parsed.data.signer_name} for signature.`,
    );
  }
  if (parsed.data.path) revalidatePath(parsed.data.path);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return ok({ token, url: `${base}/sign/${token}` });
}

/** Staff-side: the rendered document (with signature if signed) for viewing. */
export async function getSignatureDocument(input: unknown): Promise<ActionResult<{ title: string; html: string; status: string }>> {
  await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("signature_requests")
    .select("title, body_html, status, signature_name, signed_at")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!req) return fail("Not found.");
  const sig =
    req.status === "signed"
      ? signatureBlock(req.signature_name ?? "", req.signed_at ? longDate(new Date(req.signed_at)) : longDate())
      : SIGN_PENDING_HTML;
  return ok({ title: req.title, html: applySignature(req.body_html, sig), status: req.status });
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

const signSchema = z.object({ token: z.string().min(10), signer_name: z.string().trim().min(2).max(200) });

/** Public: the signer submits their typed signature. Uses the service role. */
export async function submitSignature(input: unknown): Promise<ActionResult> {
  const parsed = signSchema.safeParse(input);
  if (!parsed.success) return fail("Enter your full name to sign.");
  const admin = createAdminClient();

  const { data: req } = await admin
    .from("signature_requests")
    .select("id, status, practice_id, contact_id, deal_id, title, created_by, signer_name")
    .eq("token", parsed.data.token)
    .maybeSingle();
  if (!req) return fail("This signing link is invalid.");
  if (req.status === "signed") return fail("This document has already been signed.");
  if (!["sent", "viewed"].includes(req.status)) return fail("This signing link is no longer active.");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const { error } = await admin
    .from("signature_requests")
    .update({
      status: "signed",
      signature_name: parsed.data.signer_name,
      signed_at: new Date().toISOString(),
      viewed_at: new Date().toISOString(),
      signer_ip: ip,
    })
    .eq("id", req.id);
  if (error) return dbFail(error);

  // Let FTA know: journal on the record + notify whoever sent it.
  await systemJournal(
    { practice_id: req.practice_id ?? undefined, contact_id: req.contact_id ?? undefined, deal_id: req.deal_id ?? undefined },
    `${req.title} signed by ${parsed.data.signer_name}.`,
  );
  if (req.created_by) {
    await admin.from("notifications").insert({
      profile_id: req.created_by,
      kind: "document_signed",
      title: "Document signed",
      body: `${req.title} — signed by ${parsed.data.signer_name}.`,
      link_url: req.practice_id ? `/practices/${req.practice_id}/documents` : "/dashboard",
    });
  }
  return ok();
}
