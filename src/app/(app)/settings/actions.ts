"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

const schema = z.object({
  full_name: z.string().min(1).max(120),
  calendar_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  signature_html: z.string().max(5000).nullable(),
  phone: z.string().max(40).nullable().optional(),
  job_title: z.string().max(120).nullable().optional(),
  notify_inapp: z.boolean().optional(),
  notify_email: z.boolean().optional(),
});

export async function updateMySettings(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Check the form fields.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", me.id);
  if (error) return dbFail(error);
  revalidatePath("/settings");
  return ok();
}

/** Self-service email change. Updates the auth identity and the profile row. */
export async function changeMyEmail(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ email: z.string().email() }).safeParse(input);
  if (!parsed.success) return fail("Enter a valid email address.");
  const email = parsed.data.email.trim();

  const admin = createAdminClient();
  // email_confirm:true applies the change immediately (internal accounts).
  const { error: authErr } = await admin.auth.admin.updateUserById(me.id, { email, email_confirm: true });
  if (authErr) {
    if (/already/i.test(authErr.message) || (authErr as { code?: string }).code === "email_exists") {
      return fail("That email is already in use.");
    }
    return dbFail(authErr);
  }
  const { error } = await admin.from("profiles").update({ email }).eq("id", me.id);
  if (error) return dbFail(error);
  revalidatePath("/settings");
  return ok();
}

/** Disconnect the user's Microsoft 365 mailbox/calendar link. */
export async function disconnectMicrosoft(): Promise<ActionResult> {
  const me = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("graph_connections").delete().eq("profile_id", me.id);
  if (error) return dbFail(error);
  revalidatePath("/settings");
  return ok();
}
