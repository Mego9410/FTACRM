import { createClient } from "@/lib/supabase/server";
import type { HolidayStatus } from "@/lib/holiday-utils";

export type { HolidayStatus };

export type HolidayRequest = {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: HolidayStatus;
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  requester_name?: string | null;
  decider_name?: string | null;
};

const SELECT =
  "id, profile_id, start_date, end_date, reason, status, decision_note, decided_by, decided_at, created_at";

/** The signed-in user's own requests, newest first. RLS scopes this to them. */
export async function getMyHolidayRequests(profileId: string): Promise<HolidayRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("holiday_requests")
    .select(SELECT)
    .eq("profile_id", profileId)
    .order("start_date", { ascending: false });
  return (data ?? []) as HolidayRequest[];
}

/** Management view — every request, with requester + decider names attached. */
export async function listHolidayRequests(status?: HolidayStatus): Promise<HolidayRequest[]> {
  const supabase = await createClient();
  let query = supabase
    .from("holiday_requests")
    .select(
      `${SELECT}, requester:profiles!holiday_requests_profile_id_fkey(full_name), decider:profiles!holiday_requests_decided_by_fkey(full_name)`,
    )
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return (data ?? []).map((r) => {
    const row = r as unknown as HolidayRequest & {
      requester: { full_name: string } | null;
      decider: { full_name: string } | null;
    };
    return {
      ...row,
      requester_name: row.requester?.full_name ?? null,
      decider_name: row.decider?.full_name ?? null,
    };
  });
}
