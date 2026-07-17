import { Documents } from "@/components/record/documents";

export default async function ContactDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Documents link={{ contactId: id }} path={`/contacts/${id}/documents`} />;
}
