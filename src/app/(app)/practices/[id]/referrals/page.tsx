import { getLookup } from "@/lib/lookups";
import { listReferrals } from "@/lib/referrals";
import { RecordReferrals } from "@/components/record/record-referrals";

export default async function PracticeReferralsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [referrals, types] = await Promise.all([listReferrals({ practiceId: id }), getLookup("referral_type")]);
  return <RecordReferrals referrals={referrals} types={types} practiceId={id} />;
}
