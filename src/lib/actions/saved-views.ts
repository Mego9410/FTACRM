"use server";

import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const ENTITY = z.enum(["contacts", "practices", "deals"]);

export type SavedView = { id: string; name: string; query: string };

export async function listSavedViews(entity: "contacts" | "practices" | "deals"): Promise<SavedView[]> {
  const me = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("list_presets")
    .select("id, name, query")
    .eq("profile_id", me.id)
    .eq("entity", entity)
    .order("created_at");
  return (data ?? []) as SavedView[];
}

export async function saveView(input: unknown): Promise<ActionResult<SavedView>> {
  const me = await requireProfile();
  const parsed = z.object({ entity: ENTITY, name: z.string().trim().min(1).max(60), query: z.string().max(2000) }).safeParse(input);
  if (!parsed.success) return fail("Give the view a name.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("list_presets")
    .insert({ profile_id: me.id, entity: parsed.data.entity, name: parsed.data.name, query: parsed.data.query })
    .select("id, name, query")
    .single();
  if (error) return dbFail(error);
  return ok(data as SavedView);
}

export async function deleteSavedView(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("list_presets").delete().eq("id", parsed.data.id).eq("profile_id", me.id);
  if (error) return dbFail(error);
  return ok();
}
