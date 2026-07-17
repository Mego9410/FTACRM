import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Unsubscribe" };

/** Public, tokenised unsubscribe — no login, idempotent, GDPR/PECR compliant. */
export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  let outcome: "done" | "invalid" = "invalid";
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(token)) {
    const { data: row } = await admin
      .from("unsubscribe_tokens")
      .select("token, contact_id, campaign_id, used_at")
      .eq("token", token)
      .maybeSingle();
    if (row) {
      outcome = "done";
      if (!row.used_at) {
        const { data: contact } = await admin
          .from("contacts")
          .select("email")
          .eq("id", row.contact_id)
          .single();
        await admin
          .from("contacts")
          .update({ consent_email: false, consent_updated_at: new Date().toISOString() })
          .eq("id", row.contact_id);
        if (contact?.email) {
          await admin
            .from("suppressions")
            .upsert(
              { email: contact.email.toLowerCase(), reason: "unsubscribed", source_campaign_id: row.campaign_id },
              { onConflict: "email" },
            );
        }
        await admin
          .from("unsubscribe_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("token", token);
        await admin.from("journal_entries").insert({
          entry_type: "system",
          body: "Unsubscribed from bulk email via campaign link.",
          contact_id: row.contact_id,
        });
        if (row.campaign_id) {
          const { data: campaign } = await admin
            .from("campaigns")
            .select("unsubscribe_count")
            .eq("id", row.campaign_id)
            .single();
          await admin
            .from("campaigns")
            .update({ unsubscribe_count: (campaign?.unsubscribe_count ?? 0) + 1 })
            .eq("id", row.campaign_id);
        }
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-8 text-center shadow-sm">
        {outcome === "done" ? (
          <>
            <h1 className="text-xl font-extrabold tracking-tight text-fg-1">You're unsubscribed</h1>
            <p className="mt-2 text-sm text-fg-2">
              You won't receive bulk emails from Frank Taylor &amp; Associates again. If you change your
              mind, just let your usual contact know.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-extrabold tracking-tight text-fg-1">Link not recognised</h1>
            <p className="mt-2 text-sm text-fg-2">
              This unsubscribe link isn't valid. If you'd like to stop receiving emails, reply to any
              email from us and we'll sort it straight away.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
