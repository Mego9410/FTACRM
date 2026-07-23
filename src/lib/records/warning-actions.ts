"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { audit, diffChanges } from "@/lib/audit";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

/** Records that support a pinned warning banner. */
const WARNING_TABLES = { contacts: "/contacts", practices: "/practices" } as const;

const schema = z.object({
  table: z.enum(["contacts", "practices"]),
  id: z.string().uuid(),
  warning: z
    .string()
    .max(2000)
    .transform((s) => s.trim() || null)
    .nullable(),
});

/** Set or clear the warning on a contact or practice. Attributed via audit. */
export async function setRecordWarning(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Invalid warning.");
  const { table, id, warning } = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase.from(table).select("warning").eq("id", id).single();
  const { error } = await supabase.from(table).update({ warning }).eq("id", id);
  if (error) return dbFail(error);

  await audit(table, id, me.id, diffChanges(before ?? { warning: null }, { warning }));
  // Layout-level revalidation so the header banner and the journal pin both refresh.
  revalidatePath(`${WARNING_TABLES[table]}/${id}`, "layout");
  return ok();
}
