"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export async function addContactLink(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z
    .object({
      contact_id: z.string().uuid(),
      related_contact_id: z.string().uuid(),
      relationship: z.string().min(1).max(60),
    })
    .safeParse(input);
  if (!parsed.success) return fail("Pick a contact and relationship.");
  if (parsed.data.contact_id === parsed.data.related_contact_id) {
    return fail("A contact can't be linked to themselves.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("contact_links").insert(parsed.data);
  if (error) return fail(error.code === "23505" ? "Already linked." : error.message);
  revalidatePath(`/contacts/${parsed.data.contact_id}/related`);
  return ok();
}

export async function removeContactLink(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z.object({ id: z.string().uuid(), contact_id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase.from("contact_links").delete().eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidatePath(`/contacts/${parsed.data.contact_id}/related`);
  return ok();
}

export async function searchContacts(
  q: string,
): Promise<{ id: string; label: string; sub: string | null }[]> {
  await requireProfile();
  const term = q.replace(/[%_]/g, "").trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, company_name, email, roles")
    .or(`first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like},email.ilike.${like}`)
    .is("archived_at", null)
    .limit(8);
  return (data ?? []).map((c) => ({
    id: c.id,
    label: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Unnamed",
    sub: [c.email, (c.roles as string[]).join(", ")].filter(Boolean).join(" · ") || null,
  }));
}
