import { EmptyState } from "@/components/ui/primitives";

/** Placeholder until the matching engine phase lands. */
export async function MatchedBuyers({ practiceId: _practiceId }: { practiceId: string }) {
  return (
    <EmptyState
      title="Matching arrives shortly"
      body="Ranked buyer matches for this practice will appear here."
    />
  );
}
