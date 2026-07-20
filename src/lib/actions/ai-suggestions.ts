"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/action-result";

/**
 * Human-in-the-loop resolution of AI suggestions. Accepting a task suggestion
 * creates the task for the person who had the call (for_profile_id), attributed
 * "via AI, approved by {user}". Nothing else in the system acts on a suggestion.
 */

export async function acceptSuggestion(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z
    .object({
      id: z.string().uuid(),
      path: z.string(),
      // Optional edits applied on acceptance (task kind only)
      title: z.string().min(1).max(200).optional(),
      due_at: z.string().nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();

  const { data: suggestion } = await supabase
    .from("ai_suggestions")
    .select("*")
    .eq("id", parsed.data.id)
    .single();
  if (!suggestion) return fail("Suggestion not found.");
  if (suggestion.status !== "proposed") return fail("Already resolved.");

  if (suggestion.kind === "task") {
    const payload = suggestion.payload as { title?: string; details?: string | null; due_at?: string | null };
    const { error } = await supabase.from("tasks").insert({
      title: parsed.data.title ?? payload.title ?? "Follow up",
      details: [payload.details, `Suggested by AI from a call — approved by ${me.full_name}.`]
        .filter(Boolean)
        .join("\n\n"),
      due_at: parsed.data.due_at !== undefined ? parsed.data.due_at : (payload.due_at ?? null),
      assignee_id: suggestion.for_profile_id ?? me.id,
      created_by: me.id,
      contact_id: suggestion.contact_id,
      practice_id: suggestion.practice_id,
      deal_id: suggestion.deal_id,
    });
    if (error) return fail(error.message);
  }
  // 'note' / 'email_draft' / 'outreach': accepting just marks them handled —
  // the content itself is copied/used by the person reviewing.

  const { error } = await supabase
    .from("ai_suggestions")
    .update({ status: "accepted", resolved_by: me.id, resolved_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidatePath(parsed.data.path);
  revalidatePath("/dashboard");
  return ok();
}

export async function dismissSuggestion(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid(), path: z.string() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_suggestions")
    .update({ status: "dismissed", resolved_by: me.id, resolved_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("status", "proposed");
  if (error) return fail(error.message);
  revalidatePath(parsed.data.path);
  revalidatePath("/dashboard");
  return ok();
}
