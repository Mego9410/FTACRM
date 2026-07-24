"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

function revalidateReferrals() {
  revalidatePath("/reporting/referrals");
}

/** Add a referral category (a value under the referral_category lookup). */
export async function addReferralCategory(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ name: z.string().trim().min(1).max(120) }).safeParse(input);
  if (!parsed.success) return fail("Enter a category name.");
  const supabase = await createClient();

  const { data: type } = await supabase
    .from("lookup_types")
    .select("id")
    .eq("key", "referral_category")
    .single();
  if (!type) return fail("Referral categories aren't configured.");

  const { data: last } = await supabase
    .from("lookup_values")
    .select("sort_order")
    .eq("lookup_type_id", type.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("lookup_values")
    .insert({ lookup_type_id: type.id, value: parsed.data.name, sort_order: (last?.sort_order ?? -1) + 1 });
  if (error) return dbFail(error);
  await audit("lookup_values", type.id, me.id, [{ field: "referral_category", oldValue: null, newValue: parsed.data.name }]);
  revalidateReferrals();
  return ok();
}

/** Remove (deactivate) a referral category so it no longer appears in pickers. */
export async function removeReferralCategory(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("lookup_values").update({ is_active: false }).eq("id", parsed.data.id);
  if (error) return dbFail(error);
  await audit("lookup_values", parsed.data.id, me.id, [{ field: "is_active", oldValue: true, newValue: false }]);
  revalidateReferrals();
  return ok();
}

/** Add a company under a category. */
export async function addReferralCompany(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z
    .object({ category_id: z.string().uuid(), name: z.string().trim().min(1).max(200) })
    .safeParse(input);
  if (!parsed.success) return fail("Pick a category and enter a company name.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("referral_companies")
    .insert({ category_id: parsed.data.category_id, name: parsed.data.name, created_by: me.id })
    .select("id")
    .single();
  if (error) return fail(error.code === "23505" ? "That company already exists in this category." : error.message);
  await audit("referral_companies", data.id, me.id, [{ field: "created", oldValue: null, newValue: parsed.data.name }]);
  revalidateReferrals();
  return ok();
}

/** Remove (deactivate) a company. */
export async function removeReferralCompany(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("referral_companies").update({ is_active: false }).eq("id", parsed.data.id);
  if (error) return dbFail(error);
  await audit("referral_companies", parsed.data.id, me.id, [{ field: "is_active", oldValue: true, newValue: false }]);
  revalidateReferrals();
  return ok();
}
