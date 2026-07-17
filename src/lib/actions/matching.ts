"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export async function excludeMatch(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z
    .object({
      practice_id: z.string().uuid(),
      contact_id: z.string().uuid(),
      reason: z.string().max(200).nullable().optional(),
      path: z.string(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("match_exclusions").insert({
    practice_id: parsed.data.practice_id,
    contact_id: parsed.data.contact_id,
    reason: parsed.data.reason ?? null,
    created_by: me.id,
  });
  if (error && error.code !== "23505") return fail(error.message);
  revalidatePath(parsed.data.path);
  return ok();
}

export async function unexcludeMatch(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z
    .object({ practice_id: z.string().uuid(), contact_id: z.string().uuid(), path: z.string() })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("match_exclusions")
    .delete()
    .eq("practice_id", parsed.data.practice_id)
    .eq("contact_id", parsed.data.contact_id);
  if (error) return fail(error.message);
  revalidatePath(parsed.data.path);
  return ok();
}

/** Bulk: one follow-up task per selected buyer. */
export async function bulkAddTasks(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z
    .object({
      contact_ids: z.array(z.string().uuid()).min(1).max(200),
      practice_id: z.string().uuid().nullable(),
      title: z.string().min(1).max(200),
      due_at: z.string().nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert(
    parsed.data.contact_ids.map((contact_id) => ({
      title: parsed.data.title,
      due_at: parsed.data.due_at,
      assignee_id: me.id,
      created_by: me.id,
      contact_id,
      practice_id: parsed.data.practice_id,
    })),
  );
  if (error) return fail(error.message);
  return ok();
}
