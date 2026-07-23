"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

const inviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(120),
  role: z.enum(["admin", "manager", "agent"]),
});

export async function inviteUser(input: unknown): Promise<ActionResult> {
  const me = await requireRole("admin");
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form fields.");
  const { email, full_name, role } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset`,
  });
  if (error) return dbFail(error);

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name, role })
    .eq("id", data.user.id);
  if (profileError) return dbFail(profileError);

  await audit("profiles", data.user.id, me.id, [
    { field: "invited", oldValue: null, newValue: `${email} as ${role}` },
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
