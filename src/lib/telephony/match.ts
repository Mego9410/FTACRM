import type { SupabaseClient } from "@supabase/supabase-js";
import { normalisePhone, samePhone } from "./normalise";

export type CallMatch = {
  status: "matched" | "ambiguous" | "unmatched";
  contactId: string | null;
  contactName: string | null;
  practiceId: string | null;
  practiceTitle: string | null;
  dealId: string | null;
};

/**
 * Match an external call number to a contact (spec §8b.2): normalise to E.164,
 * candidate query on the trailing digits, verify with samePhone. Ambiguity
 * resolves to the most recently contacted candidate, flagged for review.
 * Auto-files to a practice/deal when the contact has exactly one live link.
 */
export async function matchCallToContact(
  admin: SupabaseClient,
  externalNumber: string | null,
): Promise<CallMatch> {
  const none: CallMatch = {
    status: "unmatched",
    contactId: null,
    contactName: null,
    practiceId: null,
    practiceTitle: null,
    dealId: null,
  };
  const e164 = normalisePhone(externalNumber);
  if (!e164) return none;

  const tail = e164.replace(/\D/g, "").slice(-9);
  const like = `%${tail.slice(0, 5)}%${tail.slice(5)}%`; // tolerate stored spacing
  const { data: candidates } = await admin
    .from("contacts")
    .select("id, first_name, last_name, company_name, phone, mobile, work_phone, last_contacted_at")
    .or(`phone.ilike.${like},mobile.ilike.${like},work_phone.ilike.${like}`)
    .is("archived_at", null)
    .limit(20);

  const verified = (candidates ?? []).filter(
    (c) => samePhone(c.phone, e164) || samePhone(c.mobile, e164) || samePhone(c.work_phone, e164),
  );
  if (verified.length === 0) return none;

  verified.sort(
    (a, b) =>
      new Date(b.last_contacted_at ?? 0).getTime() - new Date(a.last_contacted_at ?? 0).getTime(),
  );
  const contact = verified[0]!;
  const name =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.company_name ||
    "Unnamed";

  // Live practice links: exactly one → auto-file (same rule as email sync).
  const { data: links } = await admin
    .from("practice_contacts")
    .select("practice_id, practices!practice_contacts_practice_id_fkey(display_title, status)")
    .eq("contact_id", contact.id);
  const live = (links ?? []).filter((l) => {
    const p = l.practices as unknown as { status: string } | null;
    return p && !["completed", "withdrawn"].includes(p.status);
  });

  let practiceId: string | null = null;
  let practiceTitle: string | null = null;
  let dealId: string | null = null;
  if (live.length === 1) {
    practiceId = live[0]!.practice_id;
    practiceTitle =
      (live[0]!.practices as unknown as { display_title: string } | null)?.display_title ?? null;
    const { data: deal } = await admin
      .from("deals")
      .select("id")
      .eq("practice_id", practiceId)
      .eq("status", "in_progress")
      .maybeSingle();
    dealId = deal?.id ?? null;
  }

  return {
    status: verified.length > 1 ? "ambiguous" : "matched",
    contactId: contact.id,
    contactName: name,
    practiceId,
    practiceTitle,
    dealId,
  };
}
