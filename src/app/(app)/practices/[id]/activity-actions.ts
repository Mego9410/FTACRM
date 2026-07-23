"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { systemJournal } from "@/lib/actions/journal";
import { getLookup } from "@/lib/lookups";
import { formatGBP } from "@/lib/utils";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

/* ── Valuations ─────────────────────────────────────────────────────── */

const valuationSchema = z.object({
  id: z.string().uuid().optional(),
  practice_id: z.string().uuid(),
  appointment_at: z.string().nullable(),
  duration_mins: z.number().int().positive().max(600).nullable(),
  booked: z.boolean(),
  confirmed: z.boolean(),
  price_from: z.number().nonnegative().nullable(),
  price_to: z.number().nonnegative().nullable(),
  seller_expectation: z.number().nonnegative().nullable(),
  suggested_price: z.number().nonnegative().nullable(),
  fee_percent: z.number().nonnegative().max(100).nullable(),
  outcome: z.enum(["pending", "instructed", "declined"]).nullable(),
  notes: z.string().max(10000).nullable(),
});

export async function saveValuation(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = valuationSchema.safeParse(input);
  if (!parsed.success) return fail("Check the valuation fields.");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();

  let valuationId = id;
  if (valuationId) {
    const { error } = await supabase.from("valuations").update(fields).eq("id", valuationId);
    if (error) return dbFail(error);
  } else {
    const { data, error } = await supabase
      .from("valuations")
      .insert({ ...fields, created_by: me.id })
      .select("id")
      .single();
    if (error) return dbFail(error);
    valuationId = data.id;
  }

  // Keep a linked calendar event in step with the appointment.
  if (fields.appointment_at) {
    const { data: val } = await supabase
      .from("valuations")
      .select("calendar_event_id")
      .eq("id", valuationId)
      .single();
    const eventTypes = await getLookup("event_type");
    const valuationType = eventTypes.find((t) => t.system_key === "valuation");
    const { data: practice } = await supabase
      .from("practices")
      .select("display_title")
      .eq("id", fields.practice_id)
      .single();
    const starts = new Date(fields.appointment_at);
    const ends = new Date(starts.getTime() + (fields.duration_mins ?? 60) * 60000);
    const eventFields = {
      title: `Valuation — ${practice?.display_title ?? "practice"}`,
      event_type_id: valuationType?.id ?? null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      organiser_id: me.id,
      practice_id: fields.practice_id,
      status: "confirmed" as const,
      sync_state: "local" as const,
    };
    if (val?.calendar_event_id) {
      await supabase.from("calendar_events").update(eventFields).eq("id", val.calendar_event_id);
    } else {
      const { data: event } = await supabase
        .from("calendar_events")
        .insert({ ...eventFields, created_by: me.id })
        .select("id")
        .single();
      if (event) {
        await supabase.from("valuations").update({ calendar_event_id: event.id }).eq("id", valuationId);
        await supabase.from("calendar_event_attendees").insert({ event_id: event.id, profile_id: me.id });
      }
    }
  }

  await audit("practices", fields.practice_id, me.id, [
    { field: "valuation", oldValue: null, newValue: id ? "updated" : "added" },
  ]);
  revalidatePath(`/practices/${fields.practice_id}/valuations`);
  return ok();
}

/* ── Viewings ───────────────────────────────────────────────────────── */

const viewingSchema = z.object({
  id: z.string().uuid().optional(),
  practice_id: z.string().uuid(),
  buyer_contact_id: z.string().uuid(),
  scheduled_at: z.string(),
  duration_mins: z.number().int().positive().max(600).default(60),
  status: z.enum(["requested", "confirmed", "completed", "cancelled", "no_show"]).default("requested"),
  feedback: z.string().max(10000).nullable().optional(),
});

export async function saveViewing(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = viewingSchema.safeParse(input);
  if (!parsed.success) return fail("Check the viewing fields.");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();

  let viewingId = id;
  let eventId: string | null = null;
  if (viewingId) {
    const { data: existing } = await supabase
      .from("viewings")
      .select("calendar_event_id")
      .eq("id", viewingId)
      .single();
    eventId = existing?.calendar_event_id ?? null;
    const { error } = await supabase.from("viewings").update(fields).eq("id", viewingId);
    if (error) return dbFail(error);
  } else {
    const { data, error } = await supabase
      .from("viewings")
      .insert({ ...fields, created_by: me.id })
      .select("id")
      .single();
    if (error) return dbFail(error);
    viewingId = data.id;
    // First viewing interest links the buyer to the practice.
    await supabase
      .from("practice_contacts")
      .upsert(
        { practice_id: fields.practice_id, contact_id: fields.buyer_contact_id, role: "buyer" },
        { onConflict: "practice_id,contact_id,role", ignoreDuplicates: true },
      );
  }

  const eventTypes = await getLookup("event_type");
  const viewingType = eventTypes.find((t) => t.system_key === "viewing");
  const { data: practice } = await supabase
    .from("practices")
    .select("display_title")
    .eq("id", fields.practice_id)
    .single();
  const starts = new Date(fields.scheduled_at);
  const ends = new Date(starts.getTime() + fields.duration_mins * 60000);
  const eventFields = {
    title: `Viewing — ${practice?.display_title ?? "practice"}`,
    event_type_id: viewingType?.id ?? null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    organiser_id: me.id,
    practice_id: fields.practice_id,
    contact_id: fields.buyer_contact_id,
    status: fields.status === "cancelled" ? ("cancelled" as const) : ("confirmed" as const),
    sync_state: "local" as const,
  };
  if (eventId) {
    await supabase.from("calendar_events").update(eventFields).eq("id", eventId);
  } else {
    const { data: event } = await supabase
      .from("calendar_events")
      .insert({ ...eventFields, created_by: me.id })
      .select("id")
      .single();
    if (event) {
      await supabase.from("viewings").update({ calendar_event_id: event.id }).eq("id", viewingId);
      await supabase.from("calendar_event_attendees").insert({ event_id: event.id, profile_id: me.id });
    }
  }

  revalidatePath(`/practices/${fields.practice_id}/viewings`);
  return ok();
}

/* ── Offers ─────────────────────────────────────────────────────────── */

const offerSchema = z.object({
  practice_id: z.string().uuid(),
  buyer_contact_id: z.string().uuid(),
  amount: z.number().positive(),
  conditions: z.string().max(5000).nullable(),
  finance_status: z.enum(["cash", "mortgage_agreed", "mortgage_needed", "unknown"]).nullable(),
});

export async function addOffer(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = offerSchema.safeParse(input);
  if (!parsed.success) return fail("Check the offer fields.");
  const supabase = await createClient();
  const { error } = await supabase.from("offers").insert({ ...parsed.data, created_by: me.id });
  if (error) return dbFail(error);

  await supabase
    .from("practice_contacts")
    .upsert(
      { practice_id: parsed.data.practice_id, contact_id: parsed.data.buyer_contact_id, role: "buyer" },
      { onConflict: "practice_id,contact_id,role", ignoreDuplicates: true },
    );
  await systemJournal(
    { practice_id: parsed.data.practice_id, contact_id: parsed.data.buyer_contact_id },
    `Offer of ${formatGBP(parsed.data.amount)} received (logged by ${me.full_name}).`,
  );
  await audit("practices", parsed.data.practice_id, me.id, [
    { field: "offer", oldValue: null, newValue: formatGBP(parsed.data.amount) },
  ]);
  revalidatePath(`/practices/${parsed.data.practice_id}/offers`);
  return ok();
}

export async function updateOfferStatus(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z
    .object({
      id: z.string().uuid(),
      practice_id: z.string().uuid(),
      status: z.enum(["declined", "withdrawn", "pending"]),
    })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("offers")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) return dbFail(error);
  await audit("practices", parsed.data.practice_id, me.id, [
    { field: "offer_status", oldValue: null, newValue: parsed.data.status },
  ]);
  revalidatePath(`/practices/${parsed.data.practice_id}/offers`);
  return ok();
}

/**
 * Accept an offer: decline rivals, move the practice to under offer, create
 * the deal with stage 1 achieved, and notify the practice owner.
 */
export async function acceptOffer(input: unknown): Promise<ActionResult<{ dealId: string }>> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid(), practice_id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();

  const { data: offer } = await supabase
    .from("offers")
    .select("id, amount, buyer_contact_id, status")
    .eq("id", parsed.data.id)
    .single();
  if (!offer) return fail("Offer not found.");
  if (offer.status !== "pending") return fail("Only pending offers can be accepted.");

  const { data: existingDeal } = await supabase
    .from("deals")
    .select("id")
    .eq("practice_id", parsed.data.practice_id)
    .eq("status", "in_progress")
    .maybeSingle();
  if (existingDeal) return fail("This practice already has a deal in progress.");

  const { data: practice } = await supabase
    .from("practices")
    .select("id, display_title, owner_id")
    .eq("id", parsed.data.practice_id)
    .single();
  if (!practice) return fail("Practice not found.");

  const { data: primarySeller } = await supabase
    .from("practice_contacts")
    .select("contact_id")
    .eq("practice_id", practice.id)
    .eq("role", "seller")
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();
  await supabase.from("offers").update({ status: "accepted", accepted_at: now }).eq("id", offer.id);
  await supabase
    .from("offers")
    .update({ status: "declined" })
    .eq("practice_id", practice.id)
    .eq("status", "pending")
    .neq("id", offer.id);
  await supabase.from("practices").update({ status: "under_offer" }).eq("id", practice.id);

  const { data: stage1 } = await supabase
    .from("deal_stages")
    .select("id")
    .eq("key", "offer_accepted")
    .single();

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .insert({
      practice_id: practice.id,
      offer_id: offer.id,
      buyer_contact_id: offer.buyer_contact_id,
      seller_contact_id: primarySeller?.contact_id ?? null,
      agreed_price: offer.amount,
      current_stage_id: stage1?.id ?? null,
      owner_id: practice.owner_id ?? me.id,
    })
    .select("id")
    .single();
  if (dealError || !deal) return fail(dealError?.message ?? "Could not create deal.");

  if (stage1) {
    await supabase.from("deal_stage_events").insert({
      deal_id: deal.id,
      stage_id: stage1.id,
      achieved_on: now.slice(0, 10),
      recorded_by: me.id,
    });
  }

  await systemJournal(
    { practice_id: practice.id, deal_id: deal.id },
    `Offer of ${formatGBP(offer.amount)} accepted by ${me.full_name}. Deal created; other pending offers declined.`,
  );
  await audit("practices", practice.id, me.id, [
    { field: "offer_accepted", oldValue: null, newValue: formatGBP(offer.amount) },
  ]);

  if (practice.owner_id && practice.owner_id !== me.id) {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      profile_id: practice.owner_id,
      kind: "deal_created",
      title: "Offer accepted",
      body: `${practice.display_title} — ${formatGBP(offer.amount)}`,
      link_url: `/deals/${deal.id}`,
    });
  }

  revalidatePath(`/practices/${practice.id}`);
  return ok({ dealId: deal.id });
}
