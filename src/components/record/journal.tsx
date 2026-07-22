import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { contactName } from "@/lib/contact-helpers";
import { originKindForRoles, resolveOrigin, type EntryOrigin } from "@/lib/journal-origin";
import { JournalClient } from "./journal-client";

export type JournalLink = {
  contactId?: string;
  practiceId?: string;
  dealId?: string;
};

export type { EntryOrigin };

/** Server wrapper: loads entries + call intelligence and renders the timeline. */
export async function Journal({ link, path }: { link: JournalLink; path: string }) {
  const supabase = await createClient();

  // Records one hop out from the one being viewed. A note logged on a practice
  // should also surface on its linked sellers/buyers (and vice-versa), tagged
  // with where it came from. The record's own id is always included so its
  // native entries come back in the same query.
  const practiceIds = new Set<string>();
  const contactIds = new Set<string>();
  const dealIds = new Set<string>();
  if (link.practiceId) practiceIds.add(link.practiceId);
  if (link.contactId) contactIds.add(link.contactId);
  if (link.dealId) dealIds.add(link.dealId);

  if (link.practiceId) {
    const [{ data: pcs }, { data: dls }] = await Promise.all([
      supabase.from("practice_contacts").select("contact_id").eq("practice_id", link.practiceId),
      supabase.from("deals").select("id, buyer_contact_id, seller_contact_id").eq("practice_id", link.practiceId),
    ]);
    for (const r of (pcs ?? []) as { contact_id: string | null }[]) if (r.contact_id) contactIds.add(r.contact_id);
    for (const d of (dls ?? []) as { id: string; buyer_contact_id: string | null; seller_contact_id: string | null }[]) {
      dealIds.add(d.id);
      if (d.buyer_contact_id) contactIds.add(d.buyer_contact_id);
      if (d.seller_contact_id) contactIds.add(d.seller_contact_id);
    }
  }
  if (link.contactId) {
    const [{ data: pcs }, { data: dls }] = await Promise.all([
      supabase.from("practice_contacts").select("practice_id").eq("contact_id", link.contactId),
      supabase
        .from("deals")
        .select("id, practice_id")
        .or(
          `buyer_contact_id.eq.${link.contactId},seller_contact_id.eq.${link.contactId},buyer_solicitor_id.eq.${link.contactId},seller_solicitor_id.eq.${link.contactId}`,
        ),
    ]);
    for (const r of (pcs ?? []) as { practice_id: string | null }[]) if (r.practice_id) practiceIds.add(r.practice_id);
    for (const d of (dls ?? []) as { id: string; practice_id: string | null }[]) {
      dealIds.add(d.id);
      if (d.practice_id) practiceIds.add(d.practice_id);
    }
  }
  if (link.dealId) {
    const { data: d } = await supabase
      .from("deals")
      .select("practice_id, buyer_contact_id, seller_contact_id, buyer_solicitor_id, seller_solicitor_id")
      .eq("id", link.dealId)
      .maybeSingle();
    const deal = d as {
      practice_id: string | null;
      buyer_contact_id: string | null;
      seller_contact_id: string | null;
      buyer_solicitor_id: string | null;
      seller_solicitor_id: string | null;
    } | null;
    if (deal) {
      if (deal.practice_id) practiceIds.add(deal.practice_id);
      for (const c of [deal.buyer_contact_id, deal.seller_contact_id, deal.buyer_solicitor_id, deal.seller_solicitor_id]) {
        if (c) contactIds.add(c);
      }
    }
  }

  const orParts: string[] = [];
  if (practiceIds.size) orParts.push(`practice_id.in.(${[...practiceIds].join(",")})`);
  if (contactIds.size) orParts.push(`contact_id.in.(${[...contactIds].join(",")})`);
  if (dealIds.size) orParts.push(`deal_id.in.(${[...dealIds].join(",")})`);

  let query = supabase
    .from("journal_entries")
    .select(
      "id, entry_type, subject, body, author_id, call_outcome_id, call_direction, pinned, occurred_at, contact_id, practice_id, deal_id, profiles!journal_entries_author_id_fkey(full_name, calendar_color)",
    )
    .order("pinned", { ascending: false })
    .order("occurred_at", { ascending: false })
    .limit(200);
  if (orParts.length) query = query.or(orParts.join(","));

  // Names for the origin chips shown on inherited (linked) entries.
  const relContactIds = [...contactIds].filter((id) => id !== link.contactId);
  const relPracticeIds = [...practiceIds].filter((id) => id !== link.practiceId);
  const relDealIds = [...dealIds].filter((id) => id !== link.dealId);
  const empty = Promise.resolve({ data: [] as never[] });

  const [{ data: entries }, outcomes, contactsRes, practicesRes, dealsRes] = await Promise.all([
    query,
    getLookup("call_outcome"),
    relContactIds.length
      ? supabase.from("contacts").select("id, first_name, last_name, company_name, roles").in("id", relContactIds)
      : empty,
    relPracticeIds.length ? supabase.from("practices").select("id, display_title").in("id", relPracticeIds) : empty,
    relDealIds.length ? supabase.from("deals").select("id, ref").in("id", relDealIds) : empty,
  ]);

  const contactOrigin = new Map<string, EntryOrigin>();
  for (const c of (contactsRes.data ?? []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    roles: string[] | null;
  }[]) {
    const kind = originKindForRoles(c.roles ?? []);
    contactOrigin.set(c.id, { kind, label: contactName(c), href: `/contacts/${c.id}/journal` });
  }
  const practiceOrigin = new Map<string, EntryOrigin>();
  for (const p of (practicesRes.data ?? []) as { id: string; display_title: string }[]) {
    practiceOrigin.set(p.id, { kind: "Practice", label: p.display_title, href: `/practices/${p.id}/journal` });
  }
  const dealOrigin = new Map<string, EntryOrigin>();
  for (const d of (dealsRes.data ?? []) as { id: string; ref: string }[]) {
    dealOrigin.set(d.id, { kind: "Deal", label: d.ref, href: `/deals/${d.id}/journal` });
  }

  const originMaps = {
    primary: { contactId: link.contactId ?? null, practiceId: link.practiceId ?? null, dealId: link.dealId ?? null },
    practices: practiceOrigin,
    contacts: contactOrigin,
    deals: dealOrigin,
  };

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
          origin: resolveOrigin(e, originMaps),
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
