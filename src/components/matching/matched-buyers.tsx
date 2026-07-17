import { getMatchingBuyers } from "@/lib/matching/queries";
import { MatchedBuyersClient } from "./matched-buyers-client";

/** Ranked buyer matches for a practice, with bulk actions on selections. */
export async function MatchedBuyers({ practiceId }: { practiceId: string }) {
  const rows = await getMatchingBuyers(practiceId);
  return <MatchedBuyersClient practiceId={practiceId} rows={rows} />;
}
