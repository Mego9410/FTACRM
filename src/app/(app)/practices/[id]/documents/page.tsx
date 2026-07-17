import { Documents } from "@/components/record/documents";

export default async function PracticeDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Documents link={{ practiceId: id }} path={`/practices/${id}/documents`} />;
}
