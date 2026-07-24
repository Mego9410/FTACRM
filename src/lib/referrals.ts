import { createClient } from "@/lib/supabase/server";

export type ReferralRow = {
  id: string;
  referral_type_id: string;
  referred_on: string;
  value: number | null;
  note: string | null;
  type_name: string | null;
  practice_title: string | null;
};

/** Recent referrals with their type + linked practice name, newest first. */
export async function listReferrals(limit = 200): Promise<ReferralRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referrals")
    .select(
      "id, referral_type_id, referred_on, value, note, lookup_values!referrals_referral_type_id_fkey(value), practices!referrals_practice_id_fkey(display_title)",
    )
    .order("referred_on", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => {
    const row = r as unknown as ReferralRow & {
      lookup_values: { value: string } | null;
      practices: { display_title: string } | null;
    };
    return {
      id: row.id,
      referral_type_id: row.referral_type_id,
      referred_on: row.referred_on,
      value: row.value,
      note: row.note,
      type_name: row.lookup_values?.value ?? null,
      practice_title: row.practices?.display_title ?? null,
    };
  });
}
