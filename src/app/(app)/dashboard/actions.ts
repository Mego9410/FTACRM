"use server";

import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

// A grid item = one widget's position/size at a breakpoint.
const layoutItem = z.object({
  i: z.string().max(40),
  x: z.number().int().min(0).max(48),
  y: z.number().int().min(0).max(400),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(40),
});

const configSchema = z.object({
  version: z.literal(1),
  widgets: z.array(z.string().max(40)).max(30),
  layouts: z.object({
    lg: z.array(layoutItem).max(30),
    md: z.array(layoutItem).max(30),
  }),
});

export async function saveDashboardLayout(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid layout.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_layout: parsed.data })
    .eq("id", me.id);
  if (error) return dbFail(error);
  return ok();
}

export async function resetDashboardLayout(): Promise<ActionResult> {
  const me = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_layout: null })
    .eq("id", me.id);
  if (error) return dbFail(error);
  return ok();
}
