import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  completionsByMonth,
  computeKpis,
  computePipeline,
  computeSmartLists,
  type Period,
} from "@/lib/reporting";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Card, CardHeader } from "@/components/ui/primitives";
import { formatGBP } from "@/lib/utils";
import { ReportingFilters } from "./reporting-filters";
import { CompletionsChart } from "./completions-chart";

export const metadata = { title: "Reporting" };

type Search = { period?: string; owner?: string; branch?: string };

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

function Delta({ current, previous, money }: { current: number; previous: number; money?: boolean }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-fg-4">no change</span>;
  const diff = current - previous;
  const up = diff > 0;
  return (
    <span className={`text-xs font-bold ${up ? "text-available-fg" : diff < 0 ? "text-danger" : "text-fg-4"}`}>
      {up ? "▲" : diff < 0 ? "▼" : "•"} {money ? formatGBP(Math.abs(diff), { compact: true }) : Math.abs(diff)}
      <span className="ml-1 font-normal text-fg-4">vs prev</span>
    </span>
  );
}

export default async function ReportingPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireRole("manager");
  const params = await searchParams;
  const preset = params.period ?? "month";
  const { current, previous, label } = resolvePeriods(preset);
  const filters = { owner: params.owner, branch: params.branch };

  const supabase = await createClient();
  const [kpisNow, kpisPrev, pipeline, monthly, smartLists, { data: owners }, { data: branches }] =
    await Promise.all([
      computeKpis(current, filters),
      computeKpis(previous, filters),
      computePipeline(filters),
      completionsByMonth(),
      computeSmartLists(),
      supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
      supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
    ]);

  const tiles: { label: string; value: string; sub?: string; delta?: React.ReactNode }[] = [
    {
      label: "Instructions",
      value: String(kpisNow.instructions),
      sub: formatGBP(kpisNow.instructionsValue, { compact: true }),
      delta: <Delta current={kpisNow.instructions} previous={kpisPrev.instructions} />,
    },
    {
      label: "Valuations",
      value: String(kpisNow.valuationsBooked),
      sub: `${kpisNow.valuationsInstructed} instructed`,
      delta: <Delta current={kpisNow.valuationsBooked} previous={kpisPrev.valuationsBooked} />,
    },
    {
      label: "Offers received",
      value: String(kpisNow.offersReceived),
      delta: <Delta current={kpisNow.offersReceived} previous={kpisPrev.offersReceived} />,
    },
    {
      label: "Completions",
      value: String(kpisNow.completions),
      sub: formatGBP(kpisNow.completionsValue, { compact: true }),
      delta: <Delta current={kpisNow.completions} previous={kpisPrev.completions} />,
    },
    {
      label: "Fees banked",
      value: formatGBP(kpisNow.completionsFees, { compact: true }),
      delta: <Delta current={kpisNow.completionsFees} previous={kpisPrev.completionsFees} money />,
    },
    {
      label: "Average sale price",
      value: kpisNow.avgSalePrice ? formatGBP(kpisNow.avgSalePrice, { compact: true }) : "—",
    },
    {
      label: "Fall-throughs",
      value: String(kpisNow.fallThroughs),
      delta: <Delta current={kpisNow.fallThroughs} previous={kpisPrev.fallThroughs} />,
    },
    {
      label: "New buyers",
      value: String(kpisNow.newBuyers),
      delta: <Delta current={kpisNow.newBuyers} previous={kpisPrev.newBuyers} />,
    },
  ];

  return (
    <div>
      <PageHeader eyebrow="Management information" title="Reporting" subtitle={`Comparing ${label}`} />
      <LinkTabs
        className="mb-4"
        tabs={[
          { label: "Management", href: "/reporting", exact: true },
          { label: "Reports", href: "/reporting/reports" },
          { label: "Email marketing", href: "/reporting/email" },
          { label: "Activity feed", href: "/reporting/activity" },
        ]}
      />
      <ReportingFilters owners={owners ?? []} branches={branches ?? []} />

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
          <CardHeader title="Completions — trailing 12 months" />
          <div className="p-4">
            <CompletionsChart data={monthly} />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Pipeline right now" />
            <dl className="space-y-2.5 px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-3">Deals in progress</dt>
                <dd className="font-bold text-fg-1">{pipeline.liveDeals}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-3">Pipeline value</dt>
                <dd className="font-bold text-fg-1">{formatGBP(pipeline.liveDealsValue, { compact: true })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-3">Pipeline fees</dt>
                <dd className="font-bold text-gold-deep">{formatGBP(pipeline.pipelineFees, { compact: true })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-3">Practices available</dt>
                <dd className="font-bold text-fg-1">{pipeline.availablePractices}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-3">Buyer pool</dt>
                <dd className="font-bold text-fg-1">{pipeline.activeBuyers.toLocaleString("en-GB")}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5">
                <dt className="text-fg-3">Median days to complete</dt>
                <dd className="font-bold text-fg-1">{kpisNow.medianDaysToComplete ?? "—"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Needs attention" />
            <ul className="divide-y divide-line">
              {smartLists.map((l) => (
                <li key={l.name}>
                  <Link href={l.href} className="flex items-center justify-between px-5 py-2.5 hover:bg-surface-2" title={l.hint}>
                    <span className="text-sm font-semibold text-fg-1">{l.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${l.count > 0 ? "bg-gold-tint text-gold-deep" : "bg-surface-3 text-fg-4"}`}
                    >
                      {l.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
