"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/action-result";

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
  if (error) return fail(error.message);

  if ((items ?? []).length > 0) {
    const { error: itemsError } = await supabase.from("checklist_items").insert(
      (items ?? []).map((it) => ({ instance_id: instance.id, label: it.label, sort_order: it.sort_order })),
    );
    if (itemsError) return fail(itemsError.message);
  }
  revalidatePath(path);
  return ok();
}

export async function toggleChecklistItem(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z
    .object({ id: z.string().uuid(), checked: z.boolean(), path: z.string() })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_items")
    .update({
      checked: parsed.data.checked,
      checked_by: parsed.data.checked ? me.id : null,
      checked_at: parsed.data.checked ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidatePath(parsed.data.path);
  return ok();
}

export async function deleteChecklistInstance(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z.object({ id: z.string().uuid(), path: z.string() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_instances").delete().eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidatePath(parsed.data.path);
  return ok();
}
