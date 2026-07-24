"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  applies_to: z.enum(["contact", "practice", "deal", "valuation"]),
  is_active: z.boolean(),
  items: z.array(z.object({ id: z.string().uuid().optional(), label: z.string().min(1).max(200) })).max(50),
});

export async function saveChecklistTemplate(input: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form fields.");
  const { id, items, ...fields } = parsed.data;
  const admin = createAdminClient();

  let templateId = id;
  if (templateId) {
    const { error } = await admin.from("checklist_templates").update(fields).eq("id", templateId);
    if (error) return dbFail(error);
  } else {
    const { data, error } = await admin.from("checklist_templates").insert(fields).select("id").single();
    if (error) return dbFail(error);
    templateId = data.id;
  }

  // Replace items wholesale — templates are small and instances copy items on create.
  await admin.from("checklist_template_items").delete().eq("template_id", templateId);
  if (items.length > 0) {
    const { error } = await admin.from("checklist_template_items").insert(
      items.map((it, i) => ({ template_id: templateId, label: it.label, sort_order: i })),
    );
    if (error) return dbFail(error);
  }
  revalidatePath("/admin/checklists");
  return ok();
}

/** Permanently delete a checklist template (and its items) so unused ones don't
 * pile up. Existing checklist instances already copied their items, so this
 * doesn't affect checklists in progress. */
export async function deleteChecklistTemplate(input: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const admin = createAdminClient();
  await admin.from("checklist_template_items").delete().eq("template_id", parsed.data.id);
  const { error } = await admin.from("checklist_templates").delete().eq("id", parsed.data.id);
  if (error) return dbFail(error);
  revalidatePath("/admin/checklists");
  return ok();
}
