"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const schema = z.object({
  role: z.enum(["manager", "agent"]), // admin's grants are implicit and not editable
  permission: z.string().min(1).max(80),
  granted: z.boolean(),
});

export async function setPermission(input: unknown): Promise<ActionResult> {
  const me = await requireRole("admin");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Invalid permission change.");
  const { role, permission, granted } = parsed.data;
  const admin = createAdminClient();

  if (granted) {
    const { error } = await admin
      .from("role_permissions")
      .upsert({ role, permission }, { onConflict: "role,permission" });
    if (error) return fail(error.message);
  } else {
    const { error } = await admin
      .from("role_permissions")
      .delete()
      .eq("role", role)
      .eq("permission", permission);
    if (error) return fail(error.message);
  }
  await audit("role_permissions", me.id, me.id, [
    { field: `${role}:${permission}`, oldValue: !granted, newValue: granted },
  ]);
  revalidatePath("/admin/permissions");
  return ok();
}
