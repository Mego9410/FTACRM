import { Journal } from "@/components/record/journal";

export default async function DealJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Journal link={{ dealId: id }} path={`/deals/${id}/journal`} />;
}
