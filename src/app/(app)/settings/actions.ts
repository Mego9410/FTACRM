"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

const schema = z.object({
  full_name: z.string().min(1).max(120),
  calendar_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  signature_html: z.string().max(5000).nullable(),
});

export async function updateMySettings(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Check the form fields.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", me.id);
  if (error) return dbFail(error);
  revalidatePath("/settings");
  return ok();
}
