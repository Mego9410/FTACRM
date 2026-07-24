import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { ValuationsClient } from "./valuations-client";

export default async function PracticeValuationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: valuations }, kinds] = await Promise.all([
    supabase
      .from("valuations")
      .select(
        "id, appointment_at, duration_mins, booked, confirmed, price_from, price_to, seller_expectation, suggested_price, fee_percent, outcome, notes, kind_id",
      )
      .eq("practice_id", id)
      .order("created_at", { ascending: false }),
    getLookup("valuation_kind"),
  ]);

  return <ValuationsClient practiceId={id} valuations={valuations ?? []} kinds={kinds} />;
}
