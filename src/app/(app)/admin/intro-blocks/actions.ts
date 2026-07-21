"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const blockSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  is_active: z.boolean(),
});

export async function saveIntroBlock(input: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return fail("Check the label and text.");
  const { id, ...fields } = parsed.data;
  const admin = createAdminClient();

  if (id) {
    const { error } = await admin.from("intro_email_blocks").update(fields).eq("id", id);
    if (error) return fail(error.message);
  } else {
    const { count } = await admin.from("intro_email_blocks").select("id", { count: "exact", head: true });
    const { error } = await admin.from("intro_email_blocks").insert({ ...fields, sort_order: count ?? 0 });
    if (error) return fail(error.message);
  }
  revalidatePath("/admin/intro-blocks");
  return ok();
}

export async function deleteIntroBlock(input: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const admin = createAdminClient();
  const { error } = await admin.from("intro_email_blocks").delete().eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidatePath("/admin/intro-blocks");
  return ok();
}

export async function reorderIntroBlocks(input: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = z.object({ ids: z.array(z.string().uuid()).max(200) }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const admin = createAdminClient();
  await Promise.all(
    parsed.data.ids.map((id, i) => admin.from("intro_email_blocks").update({ sort_order: i }).eq("id", id)),
  );
  revalidatePath("/admin/intro-blocks");
  return ok();
}
