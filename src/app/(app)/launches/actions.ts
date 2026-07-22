"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadLaunchPractice } from "@/lib/email/launch-data";
import { renderLaunchEmail } from "@/lib/email/launch-template";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const createLaunchSchema = z.object({
  practice_id: z.string().uuid(),
  /** Contact ids left ticked in the builder. */
  contact_ids: z.array(z.string().uuid()).min(1, "Pick at least one buyer."),
  /** Emails from the uploaded do-not-send list (belt and braces server-side). */
  do_not_send_emails: z.array(z.string().email()).max(5000).optional(),
  /** null → queue immediately; ISO datetime → scheduled. */
  scheduled_at: z.string().datetime({ offset: true }).nullable(),
});

export async function createLaunch(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireProfile();
  await requirePermission(me, "campaigns.send");
  const parsed = createLaunchSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid launch.");
  const { practice_id, contact_ids, do_not_send_emails, scheduled_at } = parsed.data;

  if (scheduled_at && new Date(scheduled_at) <= new Date()) {
    return fail("The scheduled time must be in the future.");
  }

  const supabase = await createClient();
  const practice = await loadLaunchPractice(practice_id);
  if (!practice) return fail("Practice not found.");

  // Re-check each recipient server-side: consent, do-not-contact, archived,
  // the uploaded do-not-send list, and the global suppression list.
  const dns = new Set((do_not_send_emails ?? []).map((e) => e.toLowerCase()));
  const [{ data: contacts }, { data: suppressions }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, email, consent_email, do_not_contact, archived_at")
      .in("id", contact_ids),
    createAdminClient().from("suppressions").select("email"),
  ]);
  const suppressed = new Set((suppressions ?? []).map((s) => String(s.email).toLowerCase()));

  const eligible = (contacts ?? []).filter(
    (c) =>
      c.email &&
      !c.do_not_contact &&
      !c.archived_at &&
      c.consent_email !== false &&
      !dns.has(String(c.email).toLowerCase()) &&
      !suppressed.has(String(c.email).toLowerCase()),
  );
  if (eligible.length === 0) {
    return fail("No sendable buyers remain after consent, do-not-send and suppression checks.");
  }

  // Fetched separately and tolerantly so an un-migrated public_token column
  // can't block launches; without it the email falls back to the mailto CTA.
  let publicUrl: string | null = null;
  const { data: tokenRow } = await createAdminClient()
    .from("practices")
    .select("public_token")
    .eq("id", practice_id)
    .maybeSingle();
  const publicToken = (tokenRow as { public_token?: string | null } | null)?.public_token ?? null;
  if (publicToken && process.env.NEXT_PUBLIC_APP_URL) {
    publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/p/${publicToken}`;
  }

  const { subject, html } = renderLaunchEmail(practice, { publicUrl });

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      kind: "launch",
      name: `Launch — ${practice.display_title}`,
      subject,
      body_html: html,
      practice_id,
      segment_definition: {
        kind: "launch",
        practice_id,
        selected_contact_ids: contact_ids,
        do_not_send_count: dns.size,
      },
      status: scheduled_at ? "scheduled" : "sending",
      scheduled_at,
      started_at: scheduled_at ? null : new Date().toISOString(),
      recipient_count: eligible.length,
      from_profile_id: me.id,
      created_by: me.id,
    })
    .select("id")
    .single();
  if (error) return fail(error.message);

  const { error: recipientsError } = await supabase.from("campaign_recipients").insert(
    eligible.map((c) => ({ campaign_id: campaign.id, contact_id: c.id, email: c.email as string })),
  );
  if (recipientsError) return fail(recipientsError.message);

  await audit("campaigns", campaign.id, me.id, [
    {
      field: "launch",
      oldValue: null,
      newValue: `${practice.ref} → ${eligible.length} buyers${scheduled_at ? ` (scheduled ${scheduled_at})` : ""}`,
    },
  ]);
  revalidatePath("/launches");
  return ok({ id: campaign.id });
}
