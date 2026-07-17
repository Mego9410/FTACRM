"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const recordLink = z.object({
  contact_id: z.string().uuid().nullable().optional(),
  practice_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
});

const createSchema = recordLink.extend({
  entry_type: z.enum(["call", "note"]),
  body: z.string().min(1).max(20000),
  call_outcome_id: z.string().uuid().nullable().optional(),
  call_direction: z.enum(["inbound", "outbound"]).nullable().optional(),
  occurred_at: z.string().datetime({ offset: true }).optional(),
  path: z.string(),
});

export async function createJournalEntry(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("Write something first.");
  const { path, ...fields } = parsed.data;
  if (!fields.contact_id && !fields.practice_id && !fields.deal_id) {
    return fail("Entry must be linked to a record.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("journal_entries").insert({
    ...fields,
    call_outcome_id: fields.entry_type === "call" ? fields.call_outcome_id : null,
    call_direction: fields.entry_type === "call" ? fields.call_direction : null,
    author_id: me.id,
    occurred_at: fields.occurred_at ?? new Date().toISOString(),
  });
  if (error) return fail(error.message);
  revalidatePath(path);
  return ok();
}

/** System journal entry — used by workflow actions (status changes etc.). */
export async function systemJournal(
  link: { contact_id?: string | null; practice_id?: string | null; deal_id?: string | null },
  body: string,
) {
  const supabase = await createClient();
  await supabase.from("journal_entries").insert({ ...link, entry_type: "system", body });
}

export async function togglePin(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z
    .object({ id: z.string().uuid(), pinned: z.boolean(), path: z.string() })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("journal_entries")
    .update({ pinned: parsed.data.pinned })
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidatePath(parsed.data.path);
  return ok();
}

export async function deleteJournalEntry(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid(), path: z.string() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("journal_entries")
    .select("author_id, entry_type")
    .eq("id", parsed.data.id)
    .single();
  if (!entry) return fail("Entry not found.");
  if (entry.entry_type === "system") return fail("System entries can't be deleted.");
  if (entry.author_id !== me.id && me.role !== "admin") {
    return fail("Only the author or an administrator can delete an entry.");
  }
  const { error } = await supabase.from("journal_entries").delete().eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidatePath(parsed.data.path);
  return ok();
}
