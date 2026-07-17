import { Checklist } from "@/components/record/checklist";

export default async function ContactChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Checklist link={{ contactId: id }} appliesTo="contact" path={`/contacts/${id}/checklist`} />;
}
