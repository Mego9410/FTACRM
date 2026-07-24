import { getLookup } from "@/lib/lookups";
import { listReferrals } from "@/lib/referrals";
import { PageHeader } from "@/components/shell/page-header";
import { ReferralsClient } from "./referrals-client";

export const metadata = { title: "Referrals" };

export default async function ReferralsPage() {
  const [referrals, types] = await Promise.all([listReferrals(), getLookup("referral_type")]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Referral income"
        title="Referrals"
        subtitle="Log referrals to partners and services — they roll up in the monthly figures"
      />
      <ReferralsClient referrals={referrals} types={types} />
    </div>
  );
}
