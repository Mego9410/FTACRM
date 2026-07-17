"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateSegment, type SegmentDefinition, type SegmentEvaluation } from "@/lib/email/segment";
import { emailSendingEnabled } from "@/lib/email/provider";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const segmentSchema = z.object({
  roles: z.array(z.string()).optional(),
  temperature: z.array(z.string()).optional(),
  funding_type_ids: z.array(z.string().uuid()).optional(),
  tenure_type_ids: z.array(z.string().uuid()).optional(),
  specialism_ids: z.array(z.string().uuid()).optional(),
  deal_structure_ids: z.array(z.string().uuid()).optional(),
  min_budget: z.number().nullable().optional(),
  max_budget: z.number().nullable().optional(),
  not_contacted_days: z.number().nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  explicit_contact_ids: z.array(z.string().uuid()).optional(),
});

export async function previewSegment(input: unknown): Promise<ActionResult<SegmentEvaluation>> {
  await requireProfile();
  const parsed = segmentSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid segment.");
  const evaluation = await evaluateSegment(parsed.data as SegmentDefinition);
  return ok(evaluation);
}

const campaignSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  subject: z.string().max(300).nullable(),
  body_html: z.string().max(200000).nullable(),
  segment_definition: segmentSchema,
  practice_id: z.string().uuid().nullable(),
});

export async function saveCampaignDraft(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireProfile();
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return fail("Give the campaign a name.");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();

  if (id) {
    const { data: existing } = await supabase.from("campaigns").select("status").eq("id", id).single();
    if (existing && existing.status !== "draft") return fail("Only drafts can be edited.");
    const { error } = await supabase.from("campaigns").update(fields).eq("id", id);
    if (error) return fail(error.message);
    revalidatePath(`/campaigns/${id}`);
    return ok({ id });
  }
  const { data, error } = await supabase
    .from("campaigns")
    .insert({ ...fields, from_profile_id: me.id, created_by: me.id })
    .select("id")
    .single();
  if (error) return fail(error.message);
  return ok({ id: data.id });
}

/**
 * Queue for sending: snapshot the segment into campaign_recipients with
 * consent + suppression re-checked. Blocked while no provider is linked.
 */
export async function queueCampaign(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  await requirePermission(me, "campaigns.send");
  if (!emailSendingEnabled()) {
    return fail(
      "No email provider is linked to this deployment yet, so campaigns can be drafted but not sent. See docs/integrations.md.",
    );
  }
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, status, subject, body_html, segment_definition")
    .eq("id", parsed.data.id)
    .single();
  if (!campaign) return fail("Campaign not found.");
  if (campaign.status !== "draft") return fail("Campaign already queued or sent.");
  if (!campaign.subject || !campaign.body_html) return fail("Add a subject and body first.");

  const evaluation = await evaluateSegment(campaign.segment_definition as SegmentDefinition);
  if (evaluation.eligible.length === 0) return fail("The segment resolves to zero sendable recipients.");

  const { error: recipientsError } = await supabase.from("campaign_recipients").insert(
    evaluation.eligible.map((r) => ({
      campaign_id: campaign.id,
      contact_id: r.contact_id,
      email: r.email,
    })),
  );
  if (recipientsError) return fail(recipientsError.message);

  const { error } = await supabase
    .from("campaigns")
    .update({
      status: "sending",
      started_at: new Date().toISOString(),
      recipient_count: evaluation.eligible.length,
    })
    .eq("id", campaign.id);
  if (error) return fail(error.message);

  await audit("campaigns", campaign.id, me.id, [
    { field: "queued", oldValue: null, newValue: `${evaluation.eligible.length} recipients` },
  ]);
  revalidatePath(`/campaigns/${campaign.id}`);
  return ok();
}

export async function cancelCampaign(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.id)
    .in("status", ["draft", "scheduled", "sending"]);
  if (error) return fail(error.message);
  await audit("campaigns", parsed.data.id, me.id, [{ field: "status", oldValue: null, newValue: "cancelled" }]);
  revalidatePath(`/campaigns/${parsed.data.id}`);
  revalidatePath("/campaigns");
  return ok();
}

/* ── Templates ──────────────────────────────────────────────────────── */

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(300),
  body_html: z.string().min(1).max(200000),
  record_context: z.enum(["buyer", "seller", "practice", "deal", "contact"]),
  is_active: z.boolean(),
});

export async function saveTemplate(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return fail("Templates need a name, subject and body.");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("email_templates").update(fields).eq("id", id);
    if (error) return fail(error.message);
  } else {
    const { error } = await supabase.from("email_templates").insert({ ...fields, created_by: me.id });
    if (error) return fail(error.message);
  }
  revalidatePath("/campaigns/templates");
  return ok();
}

/* ── Suppressions ───────────────────────────────────────────────────── */

export async function addSuppression(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  await requirePermission(me, "campaigns.send");
  const parsed = z.object({ email: z.string().email() }).safeParse(input);
  if (!parsed.success) return fail("Enter a valid email.");
  const admin = createAdminClient();
  const { error } = await admin
    .from("suppressions")
    .upsert({ email: parsed.data.email.toLowerCase(), reason: "manual" }, { onConflict: "email" });
  if (error) return fail(error.message);
  await audit("suppressions", me.id, me.id, [{ field: "email", oldValue: null, newValue: parsed.data.email }]);
  revalidatePath("/campaigns/suppressions");
  return ok();
}
