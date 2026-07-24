"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || `stage_${Date.now()}`;

export async function addDealStage(input: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = z.object({ label: z.string().min(1).max(120), is_terminal: z.boolean().optional() }).safeParse(input);
  if (!parsed.success) return fail("Enter a stage name.");
  const admin = createAdminClient();
  const { data: last } = await admin.from("deal_stages").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await admin.from("deal_stages").insert({
    key: slug(parsed.data.label),
    label: parsed.data.label,
    sort_order: (last?.sort_order ?? 0) + 1,
    is_terminal: parsed.data.is_terminal ?? false,
  });
  if (error) return dbFail(error);
  revalidatePath("/admin/deal-stages");
  return ok();
}

export async function updateDealStage(input: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = z
    .object({ id: z.string().uuid(), label: z.string().min(1).max(120), is_terminal: z.boolean(), is_active: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return fail("Check the fields.");
  const { id, ...fields } = parsed.data;
  const admin = createAdminClient();
  const { error } = await admin.from("deal_stages").update(fields).eq("id", id);
  if (error) return dbFail(error);
  revalidatePath("/admin/deal-stages");
  return ok();
}

/** Reorder a stage up/down by swapping sort_order with its neighbour. */
export async function moveDealStage(input: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = z.object({ id: z.string().uuid(), dir: z.enum(["up", "down"]) }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const admin = createAdminClient();
  const { data: stages } = await admin.from("deal_stages").select("id, sort_order").order("sort_order");
  const list = stages ?? [];
  const idx = list.findIndex((s) => s.id === parsed.data.id);
  if (idx === -1) return fail("Not found.");
  const swapWith = parsed.data.dir === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return ok();
  const a = list[idx]!;
  const b = list[swapWith]!;
  await admin.from("deal_stages").update({ sort_order: b.sort_order }).eq("id", a.id);
  await admin.from("deal_stages").update({ sort_order: a.sort_order }).eq("id", b.id);
  revalidatePath("/admin/deal-stages");
  return ok();
}

/** Delete a stage — only if no deal has recorded reaching it (else deactivate). */
export async function deleteDealStage(input: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const admin = createAdminClient();
  const { count } = await admin
    .from("deal_stage_events")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", parsed.data.id);
  if ((count ?? 0) > 0) {
    return fail("This stage is in use on existing deals. Deactivate it instead of deleting.");
  }
  const { error } = await admin.from("deal_stages").delete().eq("id", parsed.data.id);
  if (error) return dbFail(error);
  revalidatePath("/admin/deal-stages");
  return ok();
}
