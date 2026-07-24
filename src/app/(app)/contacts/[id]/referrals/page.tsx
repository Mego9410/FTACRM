import { getLookup } from "@/lib/lookups";
import { listReferrals, listReferralCompanies } from "@/lib/referrals";
import { RecordReferrals } from "@/components/record/record-referrals";

export default async function ContactReferralsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [referrals, categories, companies] = await Promise.all([
    listReferrals({ contactId: id }),
    getLookup("referral_category"),
    listReferralCompanies(),
  ]);
  return <RecordReferrals referrals={referrals} categories={categories} companies={companies} contactId={id} />;
}
