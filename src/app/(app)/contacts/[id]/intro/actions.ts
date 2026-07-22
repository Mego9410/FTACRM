"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { emailSendingEnabled, getEmailProvider } from "@/lib/email/provider";
import { assembleIntroBody, INTRO_TASK_TITLE, introSignOff, renderIntroEmail } from "@/lib/email/intro-email";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const sendSchema = z.object({
  contact_id: z.string().uuid(),
  subject: z.string().min(1).max(300),
  top_text: z.string().max(5000),
  tail_text: z.string().max(5000),
  /** Ticked blocks, in order, with the (possibly per-email edited) text. */
  blocks: z.array(z.object({ id: z.string().uuid(), body: z.string().min(1).max(2000) })).max(50),
});

export async function sendIntroEmail(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  await requirePermission(me, "campaigns.send");
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return fail("Check the email fields.");
  const { contact_id, subject, top_text, tail_text, blocks } = parsed.data;

  if (!emailSendingEnabled()) {
    return fail(
      "No email provider is linked to this deployment yet, so this can't be sent. See docs/integrations.md.",
    );
  }

  const supabase = await createClient();
  const blockIds = blocks.map((b) => b.id);
  const [{ data: contact }, { data: blockRows }, { data: sender }] = await Promise.all([
    supabase.from("contacts").select("id, first_name, last_name, company_name, email, do_not_contact").eq("id", contact_id).maybeSingle(),
    blockIds.length > 0
      ? supabase.from("intro_email_blocks").select("id, label").in("id", blockIds)
      : Promise.resolve({ data: [] as { id: string; label: string }[] }),
    supabase.from("profiles").select("full_name, email, signature_html").eq("id", me.id).single(),
  ]);
  if (!contact) return fail("Contact not found.");
  if (!contact.email) return fail("This contact has no email address.");
  if (contact.do_not_contact) return fail("This contact is flagged do not contact.");

  // Labels come from the stored template (for the log); bodies come from the
  // agent's per-email version, kept in their tick order.
  const labelById = new Map((blockRows ?? []).map((b) => [b.id, b.label]));
  const senderName = sender?.full_name ?? "The FTA team";
  const bodyText = assembleIntroBody(
    top_text,
    blocks.map((b) => b.body),
    tail_text,
    introSignOff(senderName),
  );
  if (!bodyText.trim()) return fail("The email is empty.");

  const html = renderIntroEmail({ bodyText, senderSignatureHtml: sender?.signature_html ?? null });

  const provider = getEmailProvider();
  const result = await provider.send({ to: contact.email, subject, html, replyTo: sender?.email });
  if (!result.ok) return fail(result.error);

  await supabase.from("intro_emails").insert({
    contact_id,
    subject,
    body_text: bodyText,
    block_labels: blocks.map((b) => labelById.get(b.id) ?? "").filter(Boolean),
    sent_by: me.id,
  });

  await supabase.from("journal_entries").insert({
    entry_type: "email",
    subject,
    body: bodyText,
    author_id: me.id,
    contact_id,
  });

  // Close off the "send introduction email" reminder task, if one is open.
  await supabase
    .from("tasks")
    .update({ status: "done", stage: "completed", completed_at: new Date().toISOString() })
    .eq("contact_id", contact_id)
    .eq("title", INTRO_TASK_TITLE)
    .neq("status", "done");

  revalidatePath(`/contacts/${contact_id}/intro`);
  revalidatePath(`/contacts/${contact_id}/journal`);
  revalidatePath(`/contacts/${contact_id}`, "layout");
  revalidatePath("/tasks");
  return ok();
}
