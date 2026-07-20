import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";
import { SuggestionsWidgetClient } from "./suggestions-widget-client";

/** Dashboard inbox of pending AI suggestions for the signed-in user. */
export async function SuggestionsWidget({ profileId }: { profileId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_suggestions")
    .select(
      `id, kind, payload, created_at, contact_id, practice_id, deal_id,
       contacts!ai_suggestions_contact_id_fkey(first_name, last_name, company_name),
       practices!ai_suggestions_practice_id_fkey(display_title)`,
    )
    .eq("status", "proposed")
    .or(`for_profile_id.eq.${profileId},for_profile_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(8);

  const rows = (data ?? []).map((s) => {
    const contact = s.contacts as unknown as {
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
    } | null;
    const practice = s.practices as unknown as { display_title: string } | null;
    return {
      id: s.id,
      kind: s.kind as "task" | "note" | "email_draft" | "outreach",
      payload: s.payload as Record<string, unknown>,
      created_at: s.created_at,
      context: contact ? contactName(contact) : (practice?.display_title ?? null),
      href: s.contact_id
        ? `/contacts/${s.contact_id}/journal`
        : s.practice_id
          ? `/practices/${s.practice_id}/matched`
          : s.deal_id
            ? `/deals/${s.deal_id}`
            : "/dashboard",
    };
  });

  return <SuggestionsWidgetClient rows={rows} />;
}
