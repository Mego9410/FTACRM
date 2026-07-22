"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/action-result";

/**
 * Introduction-block library management, available to every signed-in user
 * (not just admins) — the composer's inline "Edit" panel calls these, and the
 * shared library is non-sensitive reusable email copy.
 */

const blockSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
});

export async function saveIntroBlockShared(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return fail("Give the block a label and some text.");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("intro_email_blocks").update(fields).eq("id", id);
    if (error) return fail(error.message);
  } else {
    const { count } = await supabase.from("intro_email_blocks").select("id", { count: "exact", head: true });
    const { error } = await supabase.from("intro_email_blocks").insert({ ...fields, sort_order: count ?? 0 });
    if (error) return fail(error.message);
  }
  revalidatePath("/contacts", "layout");
  revalidatePath("/admin/intro-blocks");
  return ok();
}

export async function deleteIntroBlockShared(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("intro_email_blocks").delete().eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidatePath("/contacts", "layout");
  revalidatePath("/admin/intro-blocks");
  return ok();
}
