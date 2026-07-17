import { Checklist } from "@/components/record/checklist";

export default async function DealChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Checklist link={{ dealId: id }} appliesTo="deal" path={`/deals/${id}/checklist`} />;
}
