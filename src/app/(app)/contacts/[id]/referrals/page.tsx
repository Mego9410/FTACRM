import { getLookup } from "@/lib/lookups";
import { listReferrals } from "@/lib/referrals";
import { RecordReferrals } from "@/components/record/record-referrals";

export default async function ContactReferralsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [referrals, types] = await Promise.all([listReferrals({ contactId: id }), getLookup("referral_type")]);
  return <RecordReferrals referrals={referrals} types={types} contactId={id} />;
}
