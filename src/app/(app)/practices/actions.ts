"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { audit, diffChanges } from "@/lib/audit";
import { geocodePostcode } from "@/lib/geo";
import { systemJournal } from "@/lib/actions/journal";
import { PRACTICE_STATUS_LABELS } from "@/lib/contact-helpers";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

const optional = (max = 200) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim() || null)
    .nullable()
    .optional();

const money = z.number().nonnegative().nullable();

const practiceSchema = z.object({
  name: optional(200),
  display_title: z.string().min(3).max(200),
  address_line1: optional(),
  address_line2: optional(),
  town: optional(120),
  county: optional(120),
  postcode: optional(12),
  asking_price: money,
  price_prefix: z.enum(["guide", "offers_over", "fixed", "poa"]),
  funding_type_id: z.string().uuid().nullable(),
  tenure_type_id: z.string().uuid().nullable(),
  trading_entity_id: z.string().uuid().nullable(),
  specialism_ids: z.array(z.string().uuid()),
  surgeries: z.number().int().nonnegative().nullable(),
  annual_turnover: money,
  ebitda: money,
  reconstituted_profit: money,
  nhs_contract_value: money,
  udas: z.number().int().nonnegative().nullable(),
  staff_count: z.number().int().nonnegative().nullable(),
  established_year: z.number().int().min(1800).max(2100).nullable(),
  description: optional(20000),
  instructed_at: z.string().nullable(),
  lease_expiry: z.string().nullable(),
  closing_date: z.string().nullable(),
  fee_percent: z.number().nonnegative().max(100).nullable(),
  fee_fixed: money,
  loa_issued_at: z.string().nullable().optional(),
  loa_received_at: z.string().nullable().optional(),
  loa_lapsed_at: z.string().nullable().optional(),
  sales_particulars_sent_at: z.string().nullable().optional(),
  being_updated: z.boolean().optional(),
  hd_paid: z.boolean().optional(),
});

async function geoFields(postcode: string | null | undefined) {
  if (!postcode) return {};
  const point = await geocodePostcode(postcode);
  return point ? { lat: point.lat, lng: point.lng } : {};
}

export async function createPractice(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireProfile();
  const parsed = practiceSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practices")
    .insert({ ...parsed.data, ...(await geoFields(parsed.data.postcode)), created_by: me.id })
    .select("id")
    .single();
  if (error) return dbFail(error);
  await audit("practices", data.id, me.id, [{ field: "created", oldValue: null, newValue: parsed.data.display_title }]);
  await attachLaunchPrep(supabase, data.id, me.id);
  return ok({ id: data.id });
}

/**
 * Attach the "Launch prep" checklist to a freshly created practice, copying its
 * template items. Best-effort — a checklist failure must never block the
 * practice being created.
 */
async function attachLaunchPrep(
  supabase: Awaited<ReturnType<typeof createClient>>,
  practiceId: string,
  meId: string,
) {
  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id, name, checklist_template_items(label, sort_order)")
    .eq("applies_to", "practice")
    .eq("name", "Launch prep")
    .eq("is_active", true)
    .maybeSingle();
  if (!template) return;

  const { data: instance } = await supabase
    .from("checklist_instances")
    .insert({ template_id: template.id, name: template.name, practice_id: practiceId, created_by: meId })
    .select("id")
    .single();
  if (!instance) return;

  const items = (template.checklist_template_items ?? []) as { label: string; sort_order: number }[];
  if (items.length > 0) {
    await supabase
      .from("checklist_items")
      .insert(items.map((it) => ({ instance_id: instance.id, label: it.label, sort_order: it.sort_order })));
  }
}

export async function updatePractice(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = practiceSchema.extend({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase.from("practices").select("*").eq("id", id).single();
  if (!before) return fail("Practice not found.");
  const { error } = await supabase
    .from("practices")
    .update({ ...fields, ...(await geoFields(fields.postcode)) })
    .eq("id", id);
  if (error) return dbFail(error);
  await audit("practices", id, me.id, diffChanges(before, fields as Record<string, unknown>));
  revalidatePath(`/practices/${id}`);
  return ok();
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["valuation", "preparing", "available", "under_offer", "sold_stc", "completed", "withdrawn"]),
  withdrawal_reason_id: z.string().uuid().nullable().optional(),
});

export async function changePracticeStatus(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid status.");
  const { id, status, withdrawal_reason_id } = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase.from("practices").select("status").eq("id", id).single();
  if (!before) return fail("Practice not found.");
  if (before.status === status) return ok();
  if (status === "withdrawn" && !withdrawal_reason_id) return fail("Pick a withdrawal reason.");

  const { error } = await supabase
    .from("practices")
    .update({
      status,
      ...(status === "withdrawn"
        ? { withdrawn_at: new Date().toISOString().slice(0, 10), withdrawal_reason_id }
        : {}),
    })
    .eq("id", id);
  if (error) return dbFail(error);

  await audit("practices", id, me.id, [{ field: "status", oldValue: before.status, newValue: status }]);
  await systemJournal(
    { practice_id: id },
    `Status changed from ${PRACTICE_STATUS_LABELS[before.status] ?? before.status} to ${PRACTICE_STATUS_LABELS[status] ?? status} by ${me.full_name}.`,
  );

  // AI-first go-to-market: the moment a practice goes live, rank the buyer
  // pool against it and flag the best people to contact. Best effort — a
  // failure here never blocks the status change.
  if (status === "available") {
    try {
      await flagLaunchOutreach(id, me.id);
    } catch {
      /* matching flag is advisory */
    }
  }
  revalidatePath(`/practices/${id}`);
  return ok();
}

async function flagLaunchOutreach(practiceId: string, changedBy: string) {
  const supabase = await createClient();
  const { getMatchingBuyers } = await import("@/lib/matching/queries");
  const matches = (await getMatchingBuyers(practiceId)).filter(
    (m) => !m.excluded && !m.do_not_contact,
  );
  if (matches.length === 0) return;

  const { data: practice } = await supabase
    .from("practices")
    .select("display_title")
    .eq("id", practiceId)
    .single();
  const top = matches.slice(0, 10).map((m) => ({
    contact_id: m.contact_id,
    name: m.name,
    score: m.score,
    facets: m.facets,
    temperature: m.temperature,
  }));

  // Replace any previous pending outreach flag for this practice.
  await supabase
    .from("ai_suggestions")
    .update({ status: "expired" })
    .eq("practice_id", practiceId)
    .eq("kind", "outreach")
    .eq("status", "proposed");
  await supabase.from("ai_suggestions").insert({
    kind: "outreach",
    practice_id: practiceId,
    for_profile_id: changedBy,
    payload: { title: `${matches.length} matched buyers for launch`, buyers: top, total: matches.length },
  });
  await systemJournal(
    { practice_id: practiceId },
    `Gone to market: ${matches.length} matching buyers identified automatically — top targets flagged for outreach.`,
  );

  await notify(changedBy, {
    kind: "launch_outreach",
    title: "Best buyers identified",
    body: `${practice?.display_title ?? "Practice"} — ${matches.length} matched buyers, top ${top.length} ranked`,
    link_url: `/practices/${practiceId}/matched`,
  });
}

/* ── People (practice_contacts) ─────────────────────────────────────── */

const personSchema = z.object({
  practice_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  role: z.enum(["seller", "buyer", "seller_solicitor", "buyer_solicitor", "accountant", "other"]),
  notes: z.string().max(2000).nullable().optional(),
});

export async function addPracticeContact(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = personSchema.safeParse(input);
  if (!parsed.success) return fail("Pick a contact and role.");
  const supabase = await createClient();

  const { count } = await supabase
    .from("practice_contacts")
    .select("id", { count: "exact", head: true })
    .eq("practice_id", parsed.data.practice_id)
    .eq("role", "seller");

  const { error } = await supabase.from("practice_contacts").insert({
    ...parsed.data,
    is_primary: parsed.data.role === "seller" && (count ?? 0) === 0,
  });
  if (error) return fail(error.code === "23505" ? "Already linked in that role." : error.message);
  await audit("practices", parsed.data.practice_id, me.id, [
    { field: `person_${parsed.data.role}`, oldValue: null, newValue: "linked" },
  ]);
  revalidatePath(`/practices/${parsed.data.practice_id}/people`);
  return ok();
}

export async function removePracticeContact(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z.object({ id: z.string().uuid(), practice_id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("practice_contacts").delete().eq("id", parsed.data.id);
  if (error) return dbFail(error);
  revalidatePath(`/practices/${parsed.data.practice_id}/people`);
  return ok();
}

export async function setPrimarySeller(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z.object({ id: z.string().uuid(), practice_id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  await supabase
    .from("practice_contacts")
    .update({ is_primary: false })
    .eq("practice_id", parsed.data.practice_id)
    .eq("role", "seller");
  const { error } = await supabase
    .from("practice_contacts")
    .update({ is_primary: true })
    .eq("id", parsed.data.id);
  if (error) return dbFail(error);
  revalidatePath(`/practices/${parsed.data.practice_id}/people`);
  return ok();
}
