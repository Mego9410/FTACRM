import { createClient } from "@/lib/supabase/server";
import { getMatchingBuyers } from "@/lib/matching/queries";
import { MatchedBuyersClient } from "./matched-buyers-client";
import { LaunchOutreachBanner } from "./launch-outreach-banner";

/** Ranked buyer matches for a practice, with bulk actions on selections. */
export async function MatchedBuyers({ practiceId }: { practiceId: string }) {
  const supabase = await createClient();
  const [rows, { data: outreach }] = await Promise.all([
    getMatchingBuyers(practiceId),
    supabase
      .from("ai_suggestions")
      .select("id, payload, created_at")
      .eq("practice_id", practiceId)
      .eq("kind", "outreach")
      .eq("status", "proposed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return (
    <div>
      {outreach ? (
        <LaunchOutreachBanner
          suggestion={{
            id: outreach.id,
            created_at: outreach.created_at,
            payload: outreach.payload as {
              buyers?: { contact_id: string; name: string; score: number; temperature: string | null }[];
              total?: number;
            },
          }}
          practiceId={practiceId}
        />
      ) : null}
      <MatchedBuyersClient practiceId={practiceId} rows={rows} />
    </div>
  );
}
