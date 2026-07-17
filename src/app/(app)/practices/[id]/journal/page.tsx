import { Journal } from "@/components/record/journal";

export default async function PracticeJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Journal link={{ practiceId: id }} path={`/practices/${id}/journal`} />;
}
