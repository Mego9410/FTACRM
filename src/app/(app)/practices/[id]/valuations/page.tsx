import { createClient } from "@/lib/supabase/server";
import { ValuationsClient } from "./valuations-client";

export default async function PracticeValuationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: valuations } = await supabase
    .from("valuations")
    .select(
      "id, appointment_at, duration_mins, booked, confirmed, price_from, price_to, seller_expectation, suggested_price, fee_percent, outcome, notes",
    )
    .eq("practice_id", id)
    .order("created_at", { ascending: false });

  return <ValuationsClient practiceId={id} valuations={valuations ?? []} />;
}
