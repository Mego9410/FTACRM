"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/http/rate-limit";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const schema = z.object({
  token: z.string().uuid(),
  name: z.string().min(2).max(200),
  job_title: z.string().max(200).nullable(),
  email: z.string().email().max(320),
  company: z.string().max(200).nullable(),
  phone: z.string().max(50).nullable(),
  consent_contact: z.boolean(),
  remove_from_list: z.boolean(),
  only_sale_details: z.boolean(),
  website: z.string(), // honeypot — must be empty
});

/** Public enquiry submission from the practice landing page. No auth. */
export async function submitPracticeEnquiry(input: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Please check your name and email address and try again.");
  const d = parsed.data;
  if (d.website !== "") return ok(); // bot filled the honeypot — pretend success, store nothing

  // [SEV-MED-06] Rate limit: process-local per-IP burst guard, plus a durable
  // per-practice DB throttle that holds across serverless instances.
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`enquiry:${ip}`, 5, 10 * 60_000)) {
    return fail("Too many requests. Please try again shortly.");
  }

  const admin = createAdminClient();

  const { data: practice } = await admin
    .from("practices")
    .select("id, ref, display_title")
    .eq("public_token", d.token)
    .maybeSingle();
  if (!practice) return fail("This page is no longer active.");

  // Durable throttle: cap enquiries per practice per 10-minute window across
  // all instances (complements the per-IP in-memory guard above).
  const { count: recentForPractice } = await admin
    .from("practice_enquiries")
    .select("id", { count: "exact", head: true })
    .eq("practice_id", practice.id)
    .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
  if ((recentForPractice ?? 0) >= 20) {
    return fail("Too many requests. Please try again shortly.");
  }

  const { error } = await admin.from("practice_enquiries").insert({
    practice_id: practice.id,
    name: d.name,
    job_title: d.job_title,
    email: d.email.toLowerCase(),
    company: d.company,
    phone: d.phone,
    consent_contact: d.consent_contact,
    remove_from_list: d.remove_from_list,
    only_sale_details: d.only_sale_details,
  });
  if (error) return fail("Something went wrong — please try again or reply to the email you received.");

  // Surface it where the team already looks: the practice journal.
  const notes = [
    d.job_title,
    d.company,
    d.phone,
    d.remove_from_list ? "asked to be removed from the mailing list" : null,
    d.only_sale_details ? "only wants details of practices for sale" : null,
  ].filter(Boolean);
  await admin.from("journal_entries").insert({
    entry_type: "system",
    practice_id: practice.id,
    pinned: false,
    body: `Web enquiry — ${d.name} (${d.email.toLowerCase()}) requested full details via the public page${notes.length ? `. ${notes.join(" · ")}` : "."}`,
  });

  return ok();
}
