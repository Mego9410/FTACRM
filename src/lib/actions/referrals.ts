"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const schema = z.object({
  category_id: z.string().uuid(),
  company_id: z.string().uuid().nullable().optional(),
  new_company_name: z.string().trim().max(200).nullable().optional(),
  referred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date."),
  value: z.number().nonnegative().nullable().optional(),
  practice_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

/** Log a referral (category + optional specific company; a new company can be
 * created inline). Attached to the buyer/seller/practice it was logged on. */
export async function createReferral(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireProfile();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the referral details.");
  const supabase = await createClient();

  // Resolve the company: an explicit id, or create a new one under the category.
  let companyId = parsed.data.company_id ?? null;
  const newName = parsed.data.new_company_name?.trim();
  if (!companyId && newName) {
    const { data: existing } = await supabase
      .from("referral_companies")
      .select("id")
      .eq("category_id", parsed.data.category_id)
      .ilike("name", newName)
      .maybeSingle();
    if (existing) {
      companyId = existing.id;
    } else {
      const { data: created, error: companyError } = await supabase
        .from("referral_companies")
        .insert({ category_id: parsed.data.category_id, name: newName, created_by: me.id })
        .select("id")
        .single();
      if (companyError) return dbFail(companyError);
      companyId = created.id;
    }
  }

  const { data, error } = await supabase
    .from("referrals")
    .insert({
      category_id: parsed.data.category_id,
      company_id: companyId,
      referred_on: parsed.data.referred_on,
      value: parsed.data.value ?? null,
      practice_id: parsed.data.practice_id ?? null,
      contact_id: parsed.data.contact_id ?? null,
      note: parsed.data.note ?? null,
      created_by: me.id,
    })
    .select("id")
    .single();
  if (error) return dbFail(error);
  await audit("referrals", data.id, me.id, [{ field: "created", oldValue: null, newValue: parsed.data.referred_on }]);
  revalidatePath("/reporting/referrals");
  if (parsed.data.contact_id) revalidatePath(`/contacts/${parsed.data.contact_id}/referrals`);
  if (parsed.data.practice_id) revalidatePath(`/practices/${parsed.data.practice_id}/referrals`);
  return ok({ id: data.id });
}

export async function deleteReferral(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("referrals").delete().eq("id", parsed.data.id);
  if (error) return dbFail(error);
  await audit("referrals", parsed.data.id, me.id, [{ field: "deleted", oldValue: "referral", newValue: null }]);
  revalidatePath("/reporting/referrals");
  return ok();
}
