"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const schema = z.object({
  company_name: z.string().min(1).max(160),
  trading_name: z.string().max(160).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  website: z.string().max(200).nullable().optional(),
  default_fee_percent: z.coerce.number().min(0).max(100).nullable().optional(),
  default_min_fee: z.string().max(40).nullable().optional(),
  email_from: z.string().max(200).nullable().optional(),
  email_reply_to: z.string().max(200).nullable().optional(),
});

export async function updateFirmSettings(input: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form fields.");
  const admin = createAdminClient();

  const clean = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]),
  );

  const { data: existing } = await admin.from("firm_settings").select("id").order("created_at").limit(1).maybeSingle();
  const { error } = existing
    ? await admin.from("firm_settings").update(clean).eq("id", existing.id)
    : await admin.from("firm_settings").insert(clean);
  if (error) return dbFail(error);
  revalidatePath("/admin/firm");
  return ok();
}
