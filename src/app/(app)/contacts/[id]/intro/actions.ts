"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { emailSendingEnabled, getEmailProvider } from "@/lib/email/provider";
import { assembleIntroBody, renderIntroEmail } from "@/lib/email/intro-email";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const sendSchema = z.object({
  contact_id: z.string().uuid(),
  subject: z.string().min(1).max(300),
  top_text: z.string().max(5000),
  tail_text: z.string().max(5000),
  block_ids: z.array(z.string().uuid()).max(50),
});

export async function sendIntroEmail(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  await requirePermission(me, "campaigns.send");
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return fail("Check the email fields.");
  const { contact_id, subject, top_text, tail_text, block_ids } = parsed.data;

  if (!emailSendingEnabled()) {
    return fail(
      "No email provider is linked to this deployment yet, so this can't be sent. See docs/integrations.md.",
    );
  }

  const supabase = await createClient();
  const [{ data: contact }, { data: blockRows }, { data: sender }] = await Promise.all([
    supabase.from("contacts").select("id, first_name, last_name, company_name, email, do_not_contact").eq("id", contact_id).maybeSingle(),
    block_ids.length > 0
      ? supabase.from("intro_email_blocks").select("id, label, body").in("id", block_ids).eq("is_active", true)
      : Promise.resolve({ data: [] as { id: string; label: string; body: string }[] }),
    supabase.from("profiles").select("full_name, email, signature_html").eq("id", me.id).single(),
  ]);
  if (!contact) return fail("Contact not found.");
  if (!contact.email) return fail("This contact has no email address.");
  if (contact.do_not_contact) return fail("This contact is flagged do not contact.");

  // Keep the agent's tick order, not the DB fetch order.
  const byId = new Map((blockRows ?? []).map((b) => [b.id, b]));
  const blocks = block_ids.map((id) => byId.get(id)).filter((b): b is NonNullable<typeof b> => Boolean(b));

  const bodyText = assembleIntroBody(top_text, blocks, tail_text);
  if (!bodyText.trim()) return fail("The email is empty.");

  const html = renderIntroEmail({ bodyText, senderName: sender?.full_name ?? "The FTA team", senderSignatureHtml: sender?.signature_html ?? null });

  const provider = getEmailProvider();
  const result = await provider.send({ to: contact.email, subject, html, replyTo: sender?.email });
  if (!result.ok) return fail(result.error);

  await supabase.from("intro_emails").insert({
    contact_id,
    subject,
    body_text: bodyText,
    block_labels: blocks.map((b) => b.label),
    sent_by: me.id,
  });

  await supabase.from("journal_entries").insert({
    entry_type: "email",
    subject,
    body: bodyText,
    author_id: me.id,
    contact_id,
  });

  revalidatePath(`/contacts/${contact_id}/intro`);
  revalidatePath(`/contacts/${contact_id}/journal`);
  return ok();
}
