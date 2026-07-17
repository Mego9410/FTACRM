import { MatchedBuyers } from "@/components/matching/matched-buyers";

export default async function PracticeMatchedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MatchedBuyers practiceId={id} />;
}
