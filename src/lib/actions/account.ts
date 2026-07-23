"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(10, "Use at least 10 characters.").max(200),
});

/**
 * Change the signed-in user's own password. Verifies the current password first
 * (re-authenticates against a throwaway client so the live session cookies are
 * untouched), then sets the new one and clears `must_change_password` via the
 * service role. One path serves both the settings page and the first-login
 * forced reset (where the "current" password is the admin-issued temporary one).
 */
export async function changePassword(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form fields.");
  const { current_password, new_password } = parsed.data;

  if (new_password === current_password) {
    return fail("Choose a password different from your current one.");
  }

  // Verify the current password without disturbing the live session.
  const verifier = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error: signInError } = await verifier.auth.signInWithPassword({
    email: me.email,
    password: current_password,
  });
  if (signInError) return fail("Your current password is incorrect.");

  const admin = createAdminClient();
  const { error: pwError } = await admin.auth.admin.updateUserById(me.id, { password: new_password });
  if (pwError) return dbFail(pwError);

  const { error: flagError } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", me.id);
  if (flagError) return dbFail(flagError);

  await audit("profiles", me.id, me.id, [{ field: "password", oldValue: null, newValue: "changed" }]);
  revalidatePath("/settings");
  return ok();
}
