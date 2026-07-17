"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const valueSchema = z.object({
  id: z.string().uuid().optional(),
  lookup_type_id: z.string().uuid(),
  value: z.string().min(1).max(120),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
  is_active: z.boolean(),
});

export async function saveLookupValue(input: unknown): Promise<ActionResult> {
  const me = await requireRole("admin");
  const parsed = valueSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form fields.");
  const { id, ...fields } = parsed.data;
  const admin = createAdminClient();

  if (id) {
    const { data: before } = await admin.from("lookup_values").select("*").eq("id", id).single();
    const { error } = await admin.from("lookup_values").update(fields).eq("id", id);
    if (error) return fail(error.message);
    await audit("lookup_values", id, me.id, [
      { field: "value", oldValue: before?.value, newValue: fields.value },
      { field: "color", oldValue: before?.color, newValue: fields.color },
      { field: "is_active", oldValue: before?.is_active, newValue: fields.is_active },
    ]);
  } else {
    const { count } = await admin
      .from("lookup_values")
      .select("id", { count: "exact", head: true })
      .eq("lookup_type_id", fields.lookup_type_id);
    const { data, error } = await admin
      .from("lookup_values")
      .insert({ ...fields, sort_order: count ?? 0 })
      .select("id")
      .single();
    if (error) {
      return fail(error.code === "23505" ? "That value already exists." : error.message);
    }
    await audit("lookup_values", data.id, me.id, [
      { field: "created", oldValue: null, newValue: fields.value },
    ]);
  }
  revalidatePath("/admin/lookups");
  return ok();
}

export async function reorderLookupValues(input: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1) }).safeParse(input);
  if (!parsed.success) return fail("Invalid order.");
  const admin = createAdminClient();
  await Promise.all(
    parsed.data.ids.map((id, i) => admin.from("lookup_values").update({ sort_order: i }).eq("id", id)),
  );
  revalidatePath("/admin/lookups");
  return ok();
}

const typeSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/, "lowercase letters, numbers and underscores"),
  label: z.string().min(1).max(120),
});

export async function createLookupType(input: unknown): Promise<ActionResult> {
  const me = await requireRole("admin");
  const parsed = typeSchema.safeParse(input);
  if (!parsed.success) return fail("Key must be lowercase snake_case; label is required.");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lookup_types")
    .insert({ ...parsed.data, is_system: false })
    .select("id")
    .single();
  if (error) return fail(error.code === "23505" ? "That key already exists." : error.message);
  await audit("lookup_types", data.id, me.id, [
    { field: "created", oldValue: null, newValue: parsed.data.key },
  ]);
  revalidatePath("/admin/lookups");
  return ok();
}
