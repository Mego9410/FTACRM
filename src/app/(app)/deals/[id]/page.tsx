import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { ProgressionClient } from "./progression-client";

export default async function DealProgressionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: deal }, { data: stages }, { data: events }, reasons] = await Promise.all([
    supabase
      .from("deals")
      .select("id, status, target_completion_date, created_at, agreed_price, buyer_solicitor_id, seller_solicitor_id, last_activity_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("deal_stages").select("id, key, label, sort_order, is_terminal").order("sort_order"),
    supabase
      .from("deal_stage_events")
      .select("stage_id, achieved_on, note, profiles!deal_stage_events_recorded_by_fkey(full_name)")
      .eq("deal_id", id),
    getLookup("fall_through_reason"),
  ]);
  if (!deal) notFound();

  return (
    <ProgressionClient
      deal={deal}
      stages={(stages ?? []).map((s) => {
        const event = (events ?? []).find((e) => e.stage_id === s.id);
        return {
          ...s,
          achieved_on: event?.achieved_on ?? null,
          note: event?.note ?? null,
          recorded_by: (event?.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
        };
      })}
      fallThroughReasons={reasons}
    />
  );
}
