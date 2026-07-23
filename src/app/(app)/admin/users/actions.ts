"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

const createSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(120),
  role: z.enum(["admin", "manager", "agent"]),
  temp_password: z.string().min(10, "The temporary password needs at least 10 characters.").max(200),
});

/**
 * Create a staff account with a temporary password the admin shares with the
 * new user. The account is flagged must_change_password, so the app forces a
 * password change on first sign-in (see the /change-password gate).
 */
export async function createUser(input: unknown): Promise<ActionResult> {
  const me = await requireRole("admin");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form fields.");
  const { email, full_name, role, temp_password } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true, // internal accounts — no email verification step
    user_metadata: { full_name },
  });
  if (error) {
    if ((error as { code?: string }).code === "email_exists" || /already/i.test(error.message)) {
      return fail("An account with that email already exists.");
    }
    return dbFail(error);
  }

  // The signup trigger provisions the profile row; set its details + force reset.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name, role, is_active: true, must_change_password: true })
    .eq("id", data.user.id);
  if (profileError) return dbFail(profileError);

  await audit("profiles", data.user.id, me.id, [
    { field: "created", oldValue: null, newValue: `${email} as ${role}` },
  ]);
  revalidatePath("/admin/users");
  return ok();
}

const updateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1).max(120),
  role: z.enum(["admin", "manager", "agent"]),
  calendar_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  is_active: z.boolean(),
});

export async function updateUser(input: unknown): Promise<ActionResult> {
  const me = await requireRole("admin");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form fields.");
  const { id, ...fields } = parsed.data;

  if (id === me.id && !fields.is_active) return fail("You can't deactivate your own account.");
  if (id === me.id && fields.role !== "admin") return fail("You can't remove your own admin role.");

  const admin = createAdminClient();
  const { data: before } = await admin.from("profiles").select("*").eq("id", id).single();
  const { error } = await admin.from("profiles").update(fields).eq("id", id);
  if (error) return dbFail(error);

  await audit("profiles", id, me.id, [
    { field: "full_name", oldValue: before?.full_name, newValue: fields.full_name },
    { field: "role", oldValue: before?.role, newValue: fields.role },
    { field: "is_active", oldValue: before?.is_active, newValue: fields.is_active },
  ]);
  revalidatePath("/admin/users");
  return ok();
}
