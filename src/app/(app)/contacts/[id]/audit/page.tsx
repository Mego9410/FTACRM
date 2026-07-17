import { AuditTrail } from "@/components/record/audit-trail";

export default async function ContactAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuditTrail table="contacts" recordId={id} />;
}
