import { requireRole } from "@/lib/auth";
import { getLookup } from "@/lib/lookups";
import { listReferrals } from "@/lib/referrals";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { ReferralsClient } from "./referrals-client";

export const metadata = { title: "Referrals" };

export default async function ReferralsPage() {
  await requireRole("manager");
  const [referrals, types] = await Promise.all([listReferrals(), getLookup("referral_type")]);

  return (
    <div>
      <PageHeader
        eyebrow="Management information"
        title="Referrals"
        subtitle="Log referrals to partners and services — they roll up in the monthly figures"
      />
      <LinkTabs
        className="mb-4"
        tabs={[
          { label: "Management", href: "/reporting", exact: true },
          { label: "Reports", href: "/reporting/reports" },
          { label: "Monthly figures", href: "/reporting/monthly" },
          { label: "Referrals", href: "/reporting/referrals" },
          { label: "Email marketing", href: "/reporting/email" },
          { label: "Activity feed", href: "/reporting/activity" },
        ]}
      />
      <div className="max-w-3xl">
        <ReferralsClient referrals={referrals} types={types} />
      </div>
    </div>
  );
}
