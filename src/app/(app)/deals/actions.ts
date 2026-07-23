"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { systemJournal } from "@/lib/actions/journal";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

/** Recompute deals.current_stage_id = first stage (by sort order) without an achieved event. */
async function refreshCurrentStage(dealId: string) {
  const supabase = await createClient();
  const [{ data: stages }, { data: events }] = await Promise.all([
    supabase.from("deal_stages").select("id, sort_order").order("sort_order"),
    supabase.from("deal_stage_events").select("stage_id").eq("deal_id", dealId),
  ]);
  const achieved = new Set((events ?? []).map((e) => e.stage_id));
  const current = (stages ?? []).find((s) => !achieved.has(s.id));
  await supabase
    .from("deals")
    .update({ current_stage_id: current?.id ?? null, last_activity_at: new Date().toISOString() })
    .eq("id", dealId);
}

const markSchema = z.object({
  deal_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  achieved_on: z.string(),
  note: z.string().max(2000).nullable().optional(),
});

export async function markStage(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  await requirePermission(me, "deals.edit");
  const parsed = markSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid stage update.");
  const supabase = await createClient();

  const { data: stage } = await supabase
    .from("deal_stages")
    .select("id, label, is_terminal")
    .eq("id", parsed.data.stage_id)
    .single();
  if (!stage) return fail("Stage not found.");

  const { error } = await supabase.from("deal_stage_events").insert({
    deal_id: parsed.data.deal_id,
    stage_id: parsed.data.stage_id,
    achieved_on: parsed.data.achieved_on,
    note: parsed.data.note ?? null,
    recorded_by: me.id,
  });
  if (error) return fail(error.code === "23505" ? "Stage already marked." : error.message);

  if (stage.is_terminal) {
    // Completion: close the deal and the practice.
    const { data: deal } = await supabase
      .from("deals")
      .select("practice_id, agreed_price")
      .eq("id", parsed.data.deal_id)
      .single();
    await supabase
      .from("deals")
      .update({ status: "completed", completed_at: parsed.data.achieved_on })
      .eq("id", parsed.data.deal_id);
    if (deal) {
      await supabase.from("practices").update({ status: "completed" }).eq("id", deal.practice_id);
      await systemJournal(
        { deal_id: parsed.data.deal_id, practice_id: deal.practice_id },
        `Completion — deal closed by ${me.full_name}. A good day for everyone involved.`,
      );
    }
  } else {
    await systemJournal(
      { deal_id: parsed.data.deal_id },
      `${stage.label} achieved (${parsed.data.achieved_on})${parsed.data.note ? ` — ${parsed.data.note}` : ""}.`,
    );
  }

  await refreshCurrentStage(parsed.data.deal_id);
  await audit("deals", parsed.data.deal_id, me.id, [
    { field: stage.label, oldValue: null, newValue: parsed.data.achieved_on },
  ]);
  revalidatePath(`/deals/${parsed.data.deal_id}`);
  revalidatePath("/deals");
  return ok();
}

export async function unmarkStage(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  await requirePermission(me, "deals.edit");
  const parsed = z.object({ deal_id: z.string().uuid(), stage_id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();

  const { data: stage } = await supabase
    .from("deal_stages")
    .select("label, is_terminal")
    .eq("id", parsed.data.stage_id)
    .single();
  const { error } = await supabase
    .from("deal_stage_events")
    .delete()
    .eq("deal_id", parsed.data.deal_id)
    .eq("stage_id", parsed.data.stage_id);
  if (error) return dbFail(error);

  if (stage?.is_terminal) {
    const { data: deal } = await supabase
      .from("deals")
      .select("practice_id")
      .eq("id", parsed.data.deal_id)
      .single();
    await supabase
      .from("deals")
      .update({ status: "in_progress", completed_at: null })
      .eq("id", parsed.data.deal_id);
    if (deal) await supabase.from("practices").update({ status: "sold_stc" }).eq("id", deal.practice_id);
  }

  await refreshCurrentStage(parsed.data.deal_id);
  await audit("deals", parsed.data.deal_id, me.id, [
    { field: stage?.label ?? "stage", oldValue: "achieved", newValue: null },
  ]);
  await systemJournal({ deal_id: parsed.data.deal_id }, `${stage?.label ?? "Stage"} un-marked by ${me.full_name}.`);
  revalidatePath(`/deals/${parsed.data.deal_id}`);
  return ok();
}

const dealStatusSchema = z.object({
  deal_id: z.string().uuid(),
  status: z.enum(["in_progress", "on_hold", "fallen_through"]),
  fall_through_reason_id: z.string().uuid().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  relist: z.boolean().optional(),
});

export async function setDealStatus(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  await requirePermission(me, "deals.edit");
  const parsed = dealStatusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const { deal_id, status, fall_through_reason_id, note, relist } = parsed.data;
  const supabase = await createClient();

  const { data: deal } = await supabase
    .from("deals")
    .select("status, practice_id, offer_id")
    .eq("id", deal_id)
    .single();
  if (!deal) return fail("Deal not found.");
  if (deal.status === "completed") return fail("Completed deals can't change status.");

  if (status === "fallen_through") {
    if (!fall_through_reason_id) return fail("Pick a fall-through reason.");
    await supabase
      .from("deals")
      .update({
        status,
        fall_through_reason_id,
        fell_through_at: new Date().toISOString().slice(0, 10),
      })
      .eq("id", deal_id);
    if (deal.offer_id) {
      await supabase.from("offers").update({ status: "fallen_through" }).eq("id", deal.offer_id);
    }
    await supabase
      .from("practices")
      .update({ status: relist ? "available" : "preparing" })
      .eq("id", deal.practice_id);
    await systemJournal(
      { deal_id, practice_id: deal.practice_id },
      `Deal fell through${note ? ` — ${note}` : ""}. Practice ${relist ? "relisted as available" : "moved to preparing"}.`,
    );
  } else {
    await supabase.from("deals").update({ status }).eq("id", deal_id);
    await systemJournal(
      { deal_id },
      `Deal ${status === "on_hold" ? "put on hold" : "resumed"} by ${me.full_name}${note ? ` — ${note}` : ""}.`,
    );
  }

  await audit("deals", deal_id, me.id, [{ field: "status", oldValue: deal.status, newValue: status }]);
  revalidatePath(`/deals/${deal_id}`);
  revalidatePath("/deals");
  return ok();
}

const dealFieldsSchema = z.object({
  deal_id: z.string().uuid(),
  target_completion_date: z.string().nullable(),
});

export async function updateDealFields(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  await requirePermission(me, "deals.edit");
  const parsed = dealFieldsSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const { deal_id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase.from("deals").select("*").eq("id", deal_id).single();
  const { error } = await supabase.from("deals").update(fields).eq("id", deal_id);
  if (error) return dbFail(error);
  await audit(
    "deals",
    deal_id,
    me.id,
    Object.entries(fields).map(([field, newValue]) => ({
      field,
      oldValue: (before as Record<string, unknown> | null)?.[field],
      newValue,
    })),
  );
  revalidatePath(`/deals/${deal_id}`);
  return ok();
}
