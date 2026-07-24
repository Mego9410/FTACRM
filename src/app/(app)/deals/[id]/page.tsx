import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { ProgressionClient } from "./progression-client";

export default async function DealProgressionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: deal }, { data: stages }, { data: events }, { data: customStages }, reasons] = await Promise.all([
    supabase
      .from("deals")
      .select("id, status, target_completion_date, created_at, agreed_price, last_activity_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("deal_stages").select("id, key, label, sort_order, is_terminal").eq("is_active", true).order("sort_order"),
    supabase
      .from("deal_stage_events")
      .select("stage_id, achieved_on, note, profiles!deal_stage_events_recorded_by_fkey(full_name)")
      .eq("deal_id", id),
    supabase.from("deal_custom_stages").select("id, label, sort_order, is_terminal, achieved_on, note").eq("deal_id", id),
    getLookup("fall_through_reason"),
  ]);
  if (!deal) notFound();

  const templateStages = (stages ?? []).map((s) => {
    const event = (events ?? []).find((e) => e.stage_id === s.id);
    return {
      id: s.id,
      key: s.key,
      label: s.label,
      sort_order: Number(s.sort_order),
      is_terminal: s.is_terminal,
      achieved_on: event?.achieved_on ?? null,
      note: event?.note ?? null,
      recorded_by: (event?.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
      custom: false as const,
    };
  });
  const custom = (customStages ?? []).map((s) => ({
    id: s.id,
    key: "custom",
    label: s.label,
    sort_order: Number(s.sort_order),
    is_terminal: s.is_terminal,
    achieved_on: s.achieved_on ?? null,
    note: s.note ?? null,
    recorded_by: null,
    custom: true as const,
  }));
  const merged = [...templateStages, ...custom].sort((a, b) => a.sort_order - b.sort_order);

  return <ProgressionClient deal={deal} stages={merged} fallThroughReasons={reasons} />;
}
