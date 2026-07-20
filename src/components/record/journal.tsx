import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { JournalClient } from "./journal-client";

export type JournalLink = {
  contactId?: string;
  practiceId?: string;
  dealId?: string;
};

/** Server wrapper: loads entries + call intelligence and renders the timeline. */
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
  const entryIds = (entries ?? []).map((e) => e.id);

  // Call intelligence: recordings/transcripts + pending AI suggestions for these entries.
  const [{ data: calls }, { data: suggestions }] = entryIds.length
    ? await Promise.all([
        supabase
          .from("call_recordings")
          .select("journal_entry_id, transcript, summary, duration_secs, analysis_status, match_status")
          .in("journal_entry_id", entryIds),
        supabase
          .from("ai_suggestions")
          .select("id, journal_entry_id, kind, status, payload")
          .in("journal_entry_id", entryIds)
          .eq("status", "proposed"),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <JournalClient
      entries={(entries ?? []).map((e) => {
        const call = (calls ?? []).find((c) => c.journal_entry_id === e.id) ?? null;
        return {
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
          call: call
            ? {
                transcript: call.transcript,
                summary: call.summary,
                duration_secs: call.duration_secs,
                analysed: call.analysis_status === "analysed",
                verify_contact: call.match_status === "ambiguous",
              }
            : null,
          suggestions: (suggestions ?? [])
            .filter((s) => s.journal_entry_id === e.id)
            .map((s) => ({
              id: s.id,
              kind: s.kind as "task" | "note" | "email_draft" | "outreach",
              payload: s.payload as Record<string, unknown>,
            })),
        };
      })}
      outcomes={outcomes}
      link={{ contact_id: link.contactId ?? null, practice_id: link.practiceId ?? null, deal_id: link.dealId ?? null }}
      path={path}
    />
  );
}
