import { createClient } from "@/lib/supabase/server";

export type ReferralRow = {
  id: string;
  referral_type_id: string;
  referred_on: string;
  value: number | null;
  note: string | null;
  type_name: string | null;
  practice_id: string | null;
  practice_title: string | null;
  contact_id: string | null;
  contact_name: string | null;
};

const SELECT =
  "id, referral_type_id, referred_on, value, note, practice_id, contact_id, " +
  "lookup_values!referrals_referral_type_id_fkey(value), " +
  "practices!referrals_practice_id_fkey(display_title), " +
  "contacts!referrals_contact_id_fkey(first_name, last_name, company_name)";

type RawReferral = {
  id: string;
  referral_type_id: string;
  referred_on: string;
  value: number | null;
  note: string | null;
  practice_id: string | null;
  contact_id: string | null;
  lookup_values: { value: string } | null;
  practices: { display_title: string } | null;
  contacts: { first_name: string | null; last_name: string | null; company_name: string | null } | null;
};

function shape(r: RawReferral): ReferralRow {
  const c = r.contacts;
  const contactName = c ? [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || null : null;
  return {
    id: r.id,
    referral_type_id: r.referral_type_id,
    referred_on: r.referred_on,
    value: r.value,
    note: r.note,
    type_name: r.lookup_values?.value ?? null,
    practice_id: r.practice_id,
    practice_title: r.practices?.display_title ?? null,
    contact_id: r.contact_id,
    contact_name: contactName,
  };
}

/** Referrals, optionally scoped to one record, newest first. */
export async function listReferrals(
  opts: { contactId?: string; practiceId?: string; limit?: number } = {},
): Promise<ReferralRow[]> {
  const supabase = await createClient();
  let query = supabase.from("referrals").select(SELECT).order("referred_on", { ascending: false }).limit(opts.limit ?? 200);
  if (opts.contactId) query = query.eq("contact_id", opts.contactId);
  if (opts.practiceId) query = query.eq("practice_id", opts.practiceId);
  const { data } = await query;
  return ((data ?? []) as unknown as RawReferral[]).map(shape);
}

export type ReferralBreakdownRow = { type_name: string; count: number; total: number };

/** Per-type totals across all referrals (count + £), for the back-end report. */
export async function referralBreakdown(): Promise<{ rows: ReferralBreakdownRow[]; count: number; total: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referrals")
    .select("value, lookup_values!referrals_referral_type_id_fkey(value, sort_order)");
  const byType = new Map<string, { sort: number; count: number; total: number }>();
  let count = 0;
  let total = 0;
  for (const r of (data ?? []) as unknown as { value: number | null; lookup_values: { value: string; sort_order: number } | null }[]) {
    const name = r.lookup_values?.value ?? "Unknown";
    const sort = r.lookup_values?.sort_order ?? 999;
    const cur = byType.get(name) ?? { sort, count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(r.value ?? 0);
    byType.set(name, cur);
    count += 1;
    total += Number(r.value ?? 0);
  }
  const rows = [...byType.entries()]
    .map(([type_name, v]) => ({ type_name, count: v.count, total: v.total, sort: v.sort }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ type_name, count: c, total: t }) => ({ type_name, count: c, total: t }));
  return { rows, count, total };
}
