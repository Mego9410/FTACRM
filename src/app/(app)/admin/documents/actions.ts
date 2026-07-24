"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  body_html: z.string().min(1).max(200000),
  is_active: z.boolean().optional(),
});

export async function saveDocumentTemplate(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireRole("admin");
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) return fail("Give the template a name and body.");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("document_templates").update(fields).eq("id", id);
    if (error) return dbFail(error);
    await audit("document_templates", id, me.id, [{ field: "updated", oldValue: null, newValue: fields.name }]);
    revalidatePath("/admin/documents");
    return ok({ id });
  }

  const { data: last } = await supabase
    .from("document_templates")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("document_templates")
    .insert({ ...fields, sort_order: (last?.sort_order ?? -1) + 1, created_by: me.id })
    .select("id")
    .single();
  if (error) return dbFail(error);
  await audit("document_templates", data.id, me.id, [{ field: "created", oldValue: null, newValue: fields.name }]);
  revalidatePath("/admin/documents");
  return ok({ id: data.id });
}

export async function deleteDocumentTemplate(input: unknown): Promise<ActionResult> {
  const me = await requireRole("admin");
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("document_templates").delete().eq("id", parsed.data.id);
  if (error) return dbFail(error);
  await audit("document_templates", parsed.data.id, me.id, [{ field: "deleted", oldValue: "template", newValue: null }]);
  revalidatePath("/admin/documents");
  return ok();
}
