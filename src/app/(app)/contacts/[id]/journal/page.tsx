import { Journal } from "@/components/record/journal";

export default async function ContactJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Journal link={{ contactId: id }} path={`/contacts/${id}/journal`} />;
}
