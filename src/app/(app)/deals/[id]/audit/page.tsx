import { AuditTrail } from "@/components/record/audit-trail";

export default async function DealAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuditTrail table="deals" recordId={id} />;
}
