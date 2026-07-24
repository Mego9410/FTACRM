"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const EXPORT_CAP = 5000;

/** Export contacts (respecting the main list filters) as CSV text. */
export async function exportContactsCsv(input: unknown): Promise<ActionResult<{ filename: string; csv: string }>> {
  await requireProfile();
  const parsed = z
    .object({ q: z.string().optional(), role: z.string().optional(), archived: z.string().optional() })
    .safeParse(input ?? {});
  if (!parsed.success) return fail("Invalid filters.");
  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select("ref, kind, first_name, last_name, company_name, email, phone, mobile, roles, status, temperature, town, postcode, created_at")
    .limit(EXPORT_CAP);
  query = parsed.data.archived === "1" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (parsed.data.role) query = query.contains("roles", [parsed.data.role]);
  if (parsed.data.q) {
    const like = `%${parsed.data.q.replace(/[%_]/g, "")}%`;
    query = query.or(`first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like},email.ilike.${like},ref.ilike.${like}`);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return dbFail(error);

  const headers = ["Ref", "Type", "First name", "Last name", "Company", "Email", "Phone", "Mobile", "Roles", "Status", "Temperature", "Town", "Postcode"];
  const rows = (data ?? []).map((c) => [
    c.ref, c.kind, c.first_name, c.last_name, c.company_name, c.email, c.phone, c.mobile,
    Array.isArray(c.roles) ? c.roles.join("; ") : "", c.status, c.temperature, c.town, c.postcode,
  ]);
  return ok({ filename: `contacts-${new Date().toISOString().slice(0, 10)}.csv`, csv: toCsv(headers, rows) });
}

const importRow = z.object({
  first_name: z.string().max(120).optional(),
  last_name: z.string().max(120).optional(),
  company_name: z.string().max(200).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(60).optional(),
  mobile: z.string().max(60).optional(),
  town: z.string().max(120).optional(),
  postcode: z.string().max(20).optional(),
  roles: z.array(z.string()).optional(),
});

/** Bulk-create contacts from mapped CSV rows. Skips rows with no identifying data. */
export async function importContacts(input: unknown): Promise<ActionResult<{ created: number; skipped: number }>> {
  const me = await requireProfile();
  await requirePermission(me, "contacts.edit");
  const parsed = z.object({ rows: z.array(importRow).max(EXPORT_CAP) }).safeParse(input);
  if (!parsed.success) return fail("Couldn't read the rows to import.");
  const supabase = await createClient();

  const toInsert = parsed.data.rows
    .filter((r) => (r.first_name || r.last_name || r.company_name || r.email))
    .map((r) => ({
      kind: !r.first_name && !r.last_name && r.company_name ? "organisation" : "person",
      first_name: r.first_name || null,
      last_name: r.last_name || null,
      company_name: r.company_name || null,
      email: r.email ? r.email.trim().toLowerCase() : null,
      phone: r.phone || null,
      mobile: r.mobile || null,
      town: r.town || null,
      postcode: r.postcode || null,
      roles: r.roles && r.roles.length ? r.roles : [],
    }));

  const skipped = parsed.data.rows.length - toInsert.length;
  if (toInsert.length === 0) return ok({ created: 0, skipped });

  // Insert in batches to stay well within limits.
  let created = 0;
  for (let i = 0; i < toInsert.length; i += 500) {
    const batch = toInsert.slice(i, i + 500);
    const { error, count } = await supabase.from("contacts").insert(batch, { count: "exact" });
    if (error) return dbFail(error);
    created += count ?? batch.length;
  }
  revalidatePath("/contacts");
  return ok({ created, skipped });
}

/** Export a specific set of contacts (bulk selection) as CSV. */
export async function exportContactsByIds(input: unknown): Promise<ActionResult<{ filename: string; csv: string }>> {
  await requireProfile();
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(EXPORT_CAP) }).safeParse(input);
  if (!parsed.success) return fail("Nothing selected.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("ref, kind, first_name, last_name, company_name, email, phone, mobile, roles, status, temperature, town, postcode")
    .in("id", parsed.data.ids);
  if (error) return dbFail(error);
  const headers = ["Ref", "Type", "First name", "Last name", "Company", "Email", "Phone", "Mobile", "Roles", "Status", "Temperature", "Town", "Postcode"];
  const rows = (data ?? []).map((c) => [
    c.ref, c.kind, c.first_name, c.last_name, c.company_name, c.email, c.phone, c.mobile,
    Array.isArray(c.roles) ? c.roles.join("; ") : "", c.status, c.temperature, c.town, c.postcode,
  ]);
  return ok({ filename: `contacts-${new Date().toISOString().slice(0, 10)}.csv`, csv: toCsv(headers, rows) });
}

/** Bulk-archive contacts. */
export async function bulkArchiveContacts(input: unknown): Promise<ActionResult<{ count: number }>> {
  const me = await requireProfile();
  await requirePermission(me, "contacts.edit");
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(EXPORT_CAP) }).safeParse(input);
  if (!parsed.success) return fail("Nothing selected.");
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").update({ archived_at: new Date().toISOString() }).in("id", parsed.data.ids);
  if (error) return dbFail(error);
  revalidatePath("/contacts");
  return ok({ count: parsed.data.ids.length });
}
