"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { geocodePlace } from "@/lib/geo";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const criteriaSchema = z.object({
  contact_id: z.string().uuid(),
  min_price: z.number().nonnegative().nullable(),
  max_price: z.number().nonnegative().nullable(),
  specialism_ids: z.array(z.string().uuid()),
  deal_structure_ids: z.array(z.string().uuid()),
  funding_type_ids: z.array(z.string().uuid()),
  tenure_type_ids: z.array(z.string().uuid()),
  buyer_position_id: z.string().uuid().nullable(),
  timescale: z.enum(["asap", "3m", "6m", "12m+"]).nullable(),
  finance_status: z.enum(["cash", "mortgage_agreed", "mortgage_needed", "unknown"]).nullable(),
  min_surgeries: z.number().int().nonnegative().nullable(),
  min_annual_turnover: z.number().nonnegative().nullable(),
  notes: z.string().max(5000).nullable(),
});

export async function saveBuyerCriteria(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = criteriaSchema.safeParse(input);
  if (!parsed.success) return fail("Check the criteria fields.");
  const { contact_id, ...fields } = parsed.data;
  if (fields.min_price != null && fields.max_price != null && fields.min_price > fields.max_price) {
    return fail("Minimum price is above maximum price.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("buyer_criteria")
    .upsert({ contact_id, ...fields }, { onConflict: "contact_id" });
  if (error) return fail(error.message);
  await audit("contacts", contact_id, me.id, [
    { field: "buyer_criteria", oldValue: null, newValue: "updated" },
  ]);
  revalidatePath(`/contacts/${contact_id}/buyer`);
  return ok();
}

const areaSchema = z.object({
  contact_id: z.string().uuid(),
  mode: z.enum(["place", "region"]),
  place: z.string().max(120).optional(),
  radius_miles: z.number().positive().max(500).optional(),
  region: z.string().max(60).optional(),
});

export async function addSearchArea(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = areaSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid area.");
  const { contact_id, mode, place, radius_miles, region } = parsed.data;
  const supabase = await createClient();

  if (mode === "region") {
    if (!region) return fail("Pick a region.");
    const { error } = await supabase
      .from("buyer_search_areas")
      .insert({ contact_id, label: region, region });
    if (error) return fail(error.message);
  } else {
    if (!place || !radius_miles) return fail("Enter a place and radius.");
    const hit = await geocodePlace(place);
    if (!hit) return fail(`Couldn't find “${place}” — try a nearby town name.`);
    const { error } = await supabase.from("buyer_search_areas").insert({
      contact_id,
      label: `${hit.label} +${radius_miles}mi`,
      lat: hit.lat,
      lng: hit.lng,
      radius_miles,
    });
    if (error) return fail(error.message);
  }
  revalidatePath(`/contacts/${contact_id}/buyer`);
  return ok();
}

export async function removeSearchArea(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z.object({ id: z.string().uuid(), contact_id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("buyer_search_areas").delete().eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidatePath(`/contacts/${parsed.data.contact_id}/buyer`);
  return ok();
}
