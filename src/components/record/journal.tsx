import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { JournalClient } from "./journal-client";

export type JournalLink = {
  contactId?: string;
  practiceId?: string;
  dealId?: string;
};

/** Server wrapper: loads entries for a record and renders the interactive timeline. */
export async function Journal({ link, path }: { link: JournalLink; path: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("journal_entries")
    .select(
      "id, entry_type, subject, body, author_id, call_outcome_id, call_direction, pinned, occurred_at, contact_id, practice_id, deal_id, profiles!journal_entries_author_id_fkey(full_name, calendar_color)",
    )
    .order("pinned", { ascending: false })
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (link.contactId) query = query.eq("contact_id", link.contactId);
  else if (link.practiceId) query = query.eq("practice_id", link.practiceId);
  else if (link.dealId) query = query.eq("deal_id", link.dealId);

  const [{ data: entries }, outcomes] = await Promise.all([query, getLookup("call_outcome")]);

  return (
    <JournalClient
      entries={(entries ?? []).map((e) => ({
        id: e.id,
        entry_type: e.entry_type,
        subject: e.subject,
        body: e.body,
        author: (e.profiles as unknown as { full_name: string; calendar_color: string } | null) ?? null,
        author_id: e.author_id,
        call_outcome_id: e.call_outcome_id,
        call_direction: e.call_direction,
        pinned: e.pinned,
        occurred_at: e.occurred_at,
      }))}
      outcomes={outcomes}
      link={{ contact_id: link.contactId ?? null, practice_id: link.practiceId ?? null, deal_id: link.dealId ?? null }}
      path={path}
    />
  );
}
