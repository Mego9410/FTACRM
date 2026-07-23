"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

const instantiateSchema = z.object({
  template_id: z.string().uuid(),
  contact_id: z.string().uuid().nullable().optional(),
  practice_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  valuation_id: z.string().uuid().nullable().optional(),
  path: z.string(),
});

export async function instantiateChecklist(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = instantiateSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const { template_id, path, ...link } = parsed.data;
  const supabase = await createClient();

  const [{ data: template }, { data: items }] = await Promise.all([
    supabase.from("checklist_templates").select("id, name").eq("id", template_id).single(),
    supabase
      .from("checklist_template_items")
      .select("label, sort_order")
      .eq("template_id", template_id)
      .order("sort_order"),
  ]);
  if (!template) return fail("Template not found.");

  const { data: instance, error } = await supabase
    .from("checklist_instances")
    .insert({ template_id, name: template.name, created_by: me.id, ...link })
    .select("id")
    .single();
  if (error) return dbFail(error);

  if ((items ?? []).length > 0) {
    const { error: itemsError } = await supabase.from("checklist_items").insert(
      (items ?? []).map((it) => ({ instance_id: instance.id, label: it.label, sort_order: it.sort_order })),
    );
    if (itemsError) return dbFail(itemsError);
  }
  revalidatePath(path);
  return ok();
}

export async function toggleChecklistItem(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z
    .object({
      id: z.string().uuid(),
      checked: z.boolean(),
      /** Date the step was actually done (YYYY-MM-DD). Defaults to today. */
      done_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      path: z.string(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const doneAt = parsed.data.done_on
    ? new Date(`${parsed.data.done_on}T12:00:00Z`).toISOString()
    : new Date().toISOString();
  const { error } = await supabase
    .from("checklist_items")
    .update({
      checked: parsed.data.checked,
      checked_by: parsed.data.checked ? me.id : null,
      checked_at: parsed.data.checked ? doneAt : null,
    })
    .eq("id", parsed.data.id);
  if (error) return dbFail(error);
  revalidatePath(parsed.data.path);
  return ok();
}

/** Edit an item's note and/or the date it was done on (legacy-style per-item edit). */
export async function updateChecklistItem(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z
    .object({
      id: z.string().uuid(),
      note: z
        .string()
        .max(2000)
        .transform((s) => s.trim() || null)
        .nullable()
        .optional(),
      done_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      path: z.string(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();

  const fields: Record<string, unknown> = {};
  if (parsed.data.note !== undefined) fields.note = parsed.data.note;
  if (parsed.data.done_on !== undefined && parsed.data.done_on !== null) {
    // Re-dating an item implies it is done — keep checked state consistent.
    fields.checked = true;
    fields.checked_at = new Date(`${parsed.data.done_on}T12:00:00Z`).toISOString();
    const { data: existing } = await supabase.from("checklist_items").select("checked_by").eq("id", parsed.data.id).single();
    if (!existing?.checked_by) fields.checked_by = me.id;
  }
  if (Object.keys(fields).length === 0) return ok();

  const { error } = await supabase.from("checklist_items").update(fields).eq("id", parsed.data.id);
  if (error) return dbFail(error);
  revalidatePath(parsed.data.path);
  return ok();
}

export async function deleteChecklistInstance(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z.object({ id: z.string().uuid(), path: z.string() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_instances").delete().eq("id", parsed.data.id);
  if (error) return dbFail(error);
  revalidatePath(parsed.data.path);
  return ok();
}
