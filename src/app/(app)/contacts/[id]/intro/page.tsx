import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { IntroComposer } from "./intro-composer";

export default async function IntroEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireProfile();
  const supabase = await createClient();
  const [{ data: contact }, { data: blocks }, { data: history }] = await Promise.all([
    supabase.from("contacts").select("id, first_name, last_name, company_name, email, do_not_contact").eq("id", id).maybeSingle(),
    supabase.from("intro_email_blocks").select("id, label, body").eq("is_active", true).order("sort_order"),
    supabase
      .from("intro_emails")
      .select("id, subject, body_text, block_labels, sent_at, profiles!intro_emails_sent_by_fkey(full_name)")
      .eq("contact_id", id)
      .order("sent_at", { ascending: false })
      .limit(20),
  ]);
  if (!contact) notFound();

  const firstName = contact.first_name || contact.company_name || "there";

  return (
    <IntroComposer
      contactId={contact.id}
      firstName={firstName}
      email={contact.email}
      doNotContact={contact.do_not_contact}
      senderName={me.full_name}
      blocks={blocks ?? []}
      history={(history ?? []).map((h) => ({
        id: h.id,
        subject: h.subject,
        body_text: h.body_text,
        block_labels: h.block_labels ?? [],
        sent_at: h.sent_at,
        sentBy: (h.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
      }))}
    />
  );
}
