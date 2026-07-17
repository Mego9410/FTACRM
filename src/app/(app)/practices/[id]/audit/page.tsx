import { AuditTrail } from "@/components/record/audit-trail";

export default async function PracticeAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuditTrail table="practices" recordId={id} />;
}
