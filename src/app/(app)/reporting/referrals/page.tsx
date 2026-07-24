import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getLookup } from "@/lib/lookups";
import { listReferralCompanies, listReferrals, referralBreakdown } from "@/lib/referrals";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { formatDate, formatGBP } from "@/lib/utils";
import { ReferralSourcesManager } from "./referral-sources-manager";

export const metadata = { title: "Referrals" };

export default async function ReferralsReportPage() {
  await requireProfile();
  const [breakdown, recent, categories, companies] = await Promise.all([
    referralBreakdown(),
    listReferrals({ limit: 100 }),
    getLookup("referral_category"),
    listReferralCompanies(),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Management information"
        title="Referrals"
        subtitle="Referrals logged across the firm, rolled up by type"
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

      <div className="mb-4">
        <ReferralSourcesManager categories={categories} companies={companies} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader title="By type (all time)" />
          <table className="w-full text-sm">
            <tbody>
              {breakdown.rows.map((r, i) => (
                <tr key={r.name} className={i % 2 ? "bg-surface-2/40" : ""}>
                  <td className="px-5 py-2 text-fg-2">{r.name}</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums text-fg-1">{r.count}</td>
                  <td className="px-5 py-2 text-right text-xs tabular-nums text-gold-deep">
                    {r.total ? formatGBP(r.total) : ""}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-line font-bold">
                <td className="px-5 py-2 text-fg-1">Total</td>
                <td className="px-3 py-2 text-right tabular-nums text-fg-1">{breakdown.count}</td>
                <td className="px-5 py-2 text-right text-xs tabular-nums text-gold-deep">
                  {breakdown.total ? formatGBP(breakdown.total) : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Recent referrals" />
          {recent.length === 0 ? (
            <EmptyState className="m-4" title="No referrals yet" body="Staff log referrals on a buyer, seller or practice record." />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((r) => {
                const href = r.contact_id
                  ? `/contacts/${r.contact_id}/referrals`
                  : r.practice_id
                    ? `/practices/${r.practice_id}/referrals`
                    : null;
                const who = r.contact_name ?? r.practice_title ?? null;
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-fg-1">{r.category_name ?? "Referral"}</span>
                        {r.company_name ? <span className="text-xs text-fg-2">· {r.company_name}</span> : null}
                        {r.value != null ? <span className="text-xs font-semibold text-gold-deep">{formatGBP(r.value)}</span> : null}
                        <span className="text-xs text-fg-3">{formatDate(r.referred_on)}</span>
                      </div>
                      {who ? (
                        href ? (
                          <Link href={href} className="text-xs font-semibold text-gold-deep hover:underline">{who}</Link>
                        ) : (
                          <span className="text-xs text-fg-3">{who}</span>
                        )
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
