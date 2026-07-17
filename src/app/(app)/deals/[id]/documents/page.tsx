import { Documents } from "@/components/record/documents";

export default async function DealDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Documents link={{ dealId: id }} path={`/deals/${id}/documents`} />;
}
