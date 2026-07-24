"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const schema = z.object({
  referral_type_id: z.string().uuid(),
  referred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date."),
  value: z.number().nonnegative().nullable().optional(),
  practice_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

/** Log a referral FTA made to a partner/service (feeds the monthly figures). */
export async function createReferral(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireProfile();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the referral details.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("referrals")
    .insert({
      referral_type_id: parsed.data.referral_type_id,
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
  revalidatePath("/referrals");
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
  revalidatePath("/referrals");
  return ok();
}
