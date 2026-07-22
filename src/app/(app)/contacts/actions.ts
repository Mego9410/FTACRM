"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, diffChanges } from "@/lib/audit";
import { geocodePostcode } from "@/lib/geo";
import { INTRO_TASK_TITLE } from "@/lib/email/intro-email";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const optional = (max = 200) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim() || null)
    .nullable()
    .optional();

const contactSchema = z.object({
  kind: z.enum(["person", "organisation"]),
  title: optional(20),
  first_name: optional(80),
  last_name: optional(80),
  company_name: optional(160),
  salutation: optional(120),
  email: z.string().email().nullable().or(z.literal("").transform(() => null)),
  email_secondary: z.string().email().nullable().or(z.literal("").transform(() => null)),
  phone: optional(40),
  mobile: optional(40),
  work_phone: optional(40),
  website: optional(200),
  address_line1: optional(),
  address_line2: optional(),
  town: optional(120),
  county: optional(120),
  postcode: optional(12),
  roles: z.array(z.enum(["buyer", "seller", "solicitor", "other"])).min(1),
  status: optional(60),
  source_id: z.string().uuid().nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  branch_id: z.string().uuid().nullable().optional(),
  temperature: z.enum(["hot", "warm", "cold"]).nullable().optional(),
  notes: optional(20000),
  organisation_id: z.string().uuid().nullable().optional(),
});

async function geoFields(postcode: string | null | undefined) {
  if (!postcode) return {};
  const point = await geocodePostcode(postcode);
  return point ? { lat: point.lat, lng: point.lng } : {};
}

export async function createContact(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireProfile();
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.");
  const supabase = await createClient();

  const hasName = parsed.data.first_name || parsed.data.last_name || parsed.data.company_name;
  if (!hasName) return fail("A contact needs a name or company name.");

  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...parsed.data, ...(await geoFields(parsed.data.postcode)), created_by: me.id })
    .select("id")
    .single();
  if (error) return fail(error.message);
  await audit("contacts", data.id, me.id, [{ field: "created", oldValue: null, newValue: "contact" }]);

  // Buyers get a reminder task to send their post-call introduction email.
  // Best-effort — a task failure must never block the contact being created.
  if (parsed.data.roles.includes("buyer")) {
    const due = new Date();
    due.setDate(due.getDate() + 3);
    const assignee = parsed.data.owner_id ?? me.id;
    const { data: task } = await supabase
      .from("tasks")
      .insert({
        title: INTRO_TASK_TITLE,
        details: "Send this buyer their introduction email after your first call.",
        due_at: due.toISOString(),
        assignee_id: assignee,
        created_by: me.id,
        contact_id: data.id,
        task_type: "email",
        stage: "not_started",
        status: "open",
      })
      .select("id")
      .single();
    if (task) await supabase.from("task_links").insert({ task_id: task.id, contact_id: data.id });
  }
  return ok({ id: data.id });
}

export async function updateContact(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = contactSchema.extend({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase.from("contacts").select("*").eq("id", id).single();
  if (!before) return fail("Contact not found.");
  const { error } = await supabase
    .from("contacts")
    .update({ ...fields, ...(await geoFields(fields.postcode)) })
    .eq("id", id);
  if (error) return fail(error.message);

  await audit("contacts", id, me.id, diffChanges(before, fields as Record<string, unknown>));
  revalidatePath(`/contacts/${id}`);
  return ok();
}

const consentSchema = z.object({
  id: z.string().uuid(),
  consent_email: z.boolean().nullable(),
  consent_sms: z.boolean().nullable(),
  consent_phone: z.boolean().nullable(),
  consent_letter: z.boolean().nullable(),
  do_not_contact: z.boolean(),
});

export async function updateConsent(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = consentSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase.from("contacts").select("*").eq("id", id).single();
  const { error } = await supabase
    .from("contacts")
    .update({ ...fields, consent_updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail(error.message);
  await audit("contacts", id, me.id, diffChanges(before, fields as Record<string, unknown>));
  revalidatePath(`/contacts/${id}`);
  return ok();
}

export async function updateAml(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z
    .object({
      id: z.string().uuid(),
      identity_verified: z.boolean(),
      address_verified: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase.from("contacts").select("*").eq("id", id).single();
  const { error } = await supabase
    .from("contacts")
    .update({
      ...fields,
      identity_verified_at: fields.identity_verified ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return fail(error.message);
  await audit("contacts", id, me.id, diffChanges(before, fields as Record<string, unknown>));
  revalidatePath(`/contacts/${id}`);
  return ok();
}

export async function archiveContact(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  await requirePermission(me, "contacts.delete");
  const parsed = z.object({ id: z.string().uuid(), archive: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({ archived_at: parsed.data.archive ? new Date().toISOString() : null })
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  await audit("contacts", parsed.data.id, me.id, [
    { field: "archived", oldValue: !parsed.data.archive, newValue: parsed.data.archive },
  ]);
  revalidatePath(`/contacts/${parsed.data.id}`);
  return ok();
}

/**
 * GDPR erasure: anonymise PII in place, keep aggregate history. Admin-gated,
 * irreversible.
 */
export async function eraseContact(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  await requirePermission(me, "contacts.erase");
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const id = parsed.data.id;
  const admin = createAdminClient();

  const { data: docs } = await admin.from("documents").select("id, storage_path").eq("contact_id", id);
  if (docs && docs.length > 0) {
    await admin.storage.from("documents").remove(docs.map((d) => d.storage_path));
    await admin.from("documents").delete().eq("contact_id", id);
  }
  await admin
    .from("journal_entries")
    .update({ body: "[erased]", subject: null })
    .eq("contact_id", id)
    .in("entry_type", ["call", "note", "email", "sms"]);
  await admin.from("buyer_search_areas").delete().eq("contact_id", id);
  await admin.from("buyer_criteria").delete().eq("contact_id", id);

  const { error } = await admin
    .from("contacts")
    .update({
      first_name: "Erased",
      last_name: "Contact",
      company_name: null,
      title: null,
      salutation: null,
      email: null,
      email_secondary: null,
      phone: null,
      mobile: null,
      work_phone: null,
      website: null,
      address_line1: null,
      address_line2: null,
      town: null,
      county: null,
      postcode: null,
      lat: null,
      lng: null,
      notes: null,
      do_not_contact: true,
      consent_email: false,
      consent_sms: false,
      consent_phone: false,
      consent_letter: false,
      archived_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return fail(error.message);

  await audit("contacts", id, me.id, [{ field: "gdpr_erasure", oldValue: null, newValue: "erased" }]);
  revalidatePath(`/contacts/${id}`);
  return ok();
}
