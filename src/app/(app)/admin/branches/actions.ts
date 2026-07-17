"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const branchSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  town: z.string().max(120).nullable(),
  phone: z.string().max(40).nullable(),
  email: z.string().email().nullable().or(z.literal("").transform(() => null)),
  is_active: z.boolean(),
});

export async function saveBranch(input: unknown): Promise<ActionResult> {
  const me = await requireRole("admin");
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form fields.");
  const { id, ...fields } = parsed.data;
  const admin = createAdminClient();

  if (id) {
    const { data: before } = await admin.from("branches").select("*").eq("id", id).single();
    const { error } = await admin.from("branches").update(fields).eq("id", id);
    if (error) return fail(error.message);
    await audit("branches", id, me.id, Object.entries(fields).map(([field, newValue]) => ({
      field,
      oldValue: (before as Record<string, unknown> | null)?.[field],
      newValue,
    })));
  } else {
    const { data, error } = await admin.from("branches").insert(fields).select("id").single();
    if (error) return fail(error.message);
    await audit("branches", data.id, me.id, [{ field: "created", oldValue: null, newValue: fields.name }]);
  }
  revalidatePath("/admin/branches");
  return ok();
}
