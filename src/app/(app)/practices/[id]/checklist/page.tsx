import { Checklist } from "@/components/record/checklist";

export default async function PracticeChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Checklist link={{ practiceId: id }} appliesTo="practice" path={`/practices/${id}/checklist`} />;
}
