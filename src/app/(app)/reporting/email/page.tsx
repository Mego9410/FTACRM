import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import type { Period } from "@/lib/reporting";
import { computeEmailKpis, emailBreakdownByKind, emailVolumeByMonth, suppressionBreakdown } from "@/lib/email/reporting";
import { emailSendingEnabled } from "@/lib/email/provider";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { EmailPeriodFilter } from "./email-period-filter";
import { EmailVolumeChart } from "./email-volume-chart";

export const metadata = { title: "Email marketing" };

type Search = { period?: string };

const SUPPRESSION_LABELS: Record<string, string> = {
  unsubscribed: "Unsubscribed",
  hard_bounce: "Hard bounce",
  complaint: "Complaint",
  manual: "Manually added",
  gdpr: "GDPR request",
};

function resolvePeriods(preset: string): { current: Period; previous: Period; label: string } {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (preset === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    const prevStart = new Date(now.getFullYear(), q * 3 - 3, 1);
    return {
      current: { from: start, to: now },
      previous: { from: prevStart, to: new Date(start.getTime() - 1) },
      label: "this quarter vs last",
    };
  }
  if (preset === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const prevStart = new Date(now.getFullYear() - 1, 0, 1);
    const prevEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return {
      current: { from: start, to: now },
      previous: { from: prevStart, to: prevEnd },
      label: "year to date vs prior YTD",
    };
  }
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    current: { from: startOfMonth, to: now },
    previous: { from: prevStart, to: new Date(startOfMonth.getTime() - 1) },
    label: "this month vs last",
  };
}

/** Count delta — up is good unless `invert` (e.g. bounces, unsubscribes). */
function Delta({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-fg-4">no change</span>;
  const diff = current - previous;
  const up = diff > 0;
  const good = invert ? !up : up;
  return (
    <span className={`text-xs font-bold ${diff === 0 ? "text-fg-4" : good ? "text-available-fg" : "text-danger"}`}>
      {up ? "▲" : diff < 0 ? "▼" : "•"} {Math.abs(diff)}
      <span className="ml-1 font-normal text-fg-4">vs prev</span>
    </span>
  );
}

/** Rate delta in percentage points. */
function RateDelta({ current, previous, invert }: { current: number | null; previous: number | null; invert?: boolean }) {
  if (current === null || previous === null) return <span className="text-xs text-fg-4">—</span>;
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) return <span className="text-xs text-fg-4">no change</span>;
  const up = diff > 0;
  const good = invert ? !up : up;
  return (
    <span className={`text-xs font-bold ${good ? "text-available-fg" : "text-danger"}`}>
      {up ? "▲" : "▼"} {Math.abs(diff)}pp<span className="ml-1 font-normal text-fg-4">vs prev</span>
    </span>
  );
}

const rate = (v: number | null) => (v === null ? "—" : `${v}%`);

export default async function EmailReportingPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireProfile();
  const params = await searchParams;
  const preset = params.period ?? "month";
  const { current, previous, label } = resolvePeriods(preset);

  const [kpisNow, kpisPrev, byKind, monthly, suppressions] = await Promise.all([
    computeEmailKpis(current),
    computeEmailKpis(previous),
    emailBreakdownByKind(current),
    emailVolumeByMonth(),
    suppressionBreakdown(),
  ]);
  const providerLinked = emailSendingEnabled();

  const tiles: { label: string; value: string; sub?: string; delta?: React.ReactNode }[] = [
    {
      label: "Emails sent",
      value: kpisNow.sent.toLocaleString("en-GB"),
      sub: `${kpisNow.sends} send${kpisNow.sends === 1 ? "" : "s"}`,
      delta: <Delta current={kpisNow.sent} previous={kpisPrev.sent} />,
    },
    {
      label: "Delivered",
      value: rate(kpisNow.deliveryRate),
      sub: `${kpisNow.delivered.toLocaleString("en-GB")} of ${kpisNow.sent.toLocaleString("en-GB")}`,
      delta: <RateDelta current={kpisNow.deliveryRate} previous={kpisPrev.deliveryRate} />,
    },
    {
      label: "Open rate",
      value: rate(kpisNow.openRate),
      sub: `${kpisNow.opened.toLocaleString("en-GB")} opens`,
      delta: <RateDelta current={kpisNow.openRate} previous={kpisPrev.openRate} />,
    },
    {
      label: "Click rate",
      value: rate(kpisNow.clickRate),
      sub: `${kpisNow.clicked.toLocaleString("en-GB")} clicks`,
      delta: <RateDelta current={kpisNow.clickRate} previous={kpisPrev.clickRate} />,
    },
    {
      label: "Bounce rate",
      value: rate(kpisNow.bounceRate),
      sub: `${kpisNow.bounced.toLocaleString("en-GB")} bounces`,
      delta: <RateDelta current={kpisNow.bounceRate} previous={kpisPrev.bounceRate} invert />,
    },
    {
      label: "Unsubscribe rate",
      value: rate(kpisNow.unsubscribeRate),
      sub: `${kpisNow.unsubscribed.toLocaleString("en-GB")} unsubscribes`,
      delta: <RateDelta current={kpisNow.unsubscribeRate} previous={kpisPrev.unsubscribeRate} invert />,
    },
    {
      label: "Suppressed (all time)",
      value: suppressions.total.toLocaleString("en-GB"),
      sub: "Never emailed again",
    },
  ];

  return (
    <div>
      <PageHeader eyebrow="Management information" title="Email marketing" subtitle={`Comparing ${label}`} />
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <EmailPeriodFilter />
        <Link href="/reporting/reports?report=email_sends" className="text-sm font-semibold text-gold-deep hover:underline">
          See every send, with export →
        </Link>
      </div>

      {!providerLinked ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-warn/40 bg-warn-bg px-4 py-3 text-sm font-semibold text-warn">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          No email provider is linked yet, so sends queue but delivered, opened, clicked and bounced will read zero
          until Resend is connected — sent counts and unsubscribes (from the in-app link) are already live.
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-3">{t.label}</p>
            <p className="mt-1 text-[24px] font-extrabold leading-none text-fg-1">{t.value}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              {t.sub ? <span className="text-xs text-fg-3">{t.sub}</span> : <span />}
              {t.delta}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Sent vs opened — trailing 12 months" />
          <div className="p-4">
            <EmailVolumeChart data={monthly} />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Launches vs campaigns" />
            <dl className="divide-y divide-line px-5">
              {byKind.map((k) => (
                <div key={k.kind} className="grid grid-cols-3 gap-2 py-3 text-sm">
                  <dt className="font-bold capitalize text-fg-1">{k.kind === "launch" ? "Launches" : "Campaigns"}</dt>
                  <dd className="text-center text-fg-2">{k.sent.toLocaleString("en-GB")} sent</dd>
                  <dd className="text-right font-semibold text-gold-deep">{rate(k.openRate)} opened</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Suppressions & opt-outs"
              action={
                <Link href="/campaigns/suppressions" className="text-xs font-semibold text-gold-deep hover:underline">
                  Manage list
                </Link>
              }
            />
            {suppressions.byReason.length === 0 ? (
              <p className="px-5 py-6 text-sm text-fg-3">Nobody has opted out yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {suppressions.byReason.map((r) => (
                  <li key={r.reason} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className="font-semibold text-fg-1">{SUPPRESSION_LABELS[r.reason] ?? r.reason}</span>
                    <Badge>{r.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
