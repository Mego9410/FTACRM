import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { REPORTS } from "@/lib/reports";
import type { Period } from "@/lib/reporting";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ReportingFilters } from "../reporting-filters";
import { ReportView } from "../report-view";

export const metadata = { title: "Reports" };

type Search = { report?: string; period?: string; owner?: string; branch?: string };

function periodFor(preset: string): { period: Period; label: string } {
  const now = new Date();
  if (preset === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { period: { from: new Date(now.getFullYear(), q * 3, 1), to: now }, label: "this quarter to date" };
  }
  if (preset === "year") {
    return { period: { from: new Date(now.getFullYear(), 0, 1), to: now }, label: "year to date" };
  }
  if (preset === "all") {
    return { period: { from: new Date(2000, 0, 1), to: now }, label: "all time" };
  }
  return { period: { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }, label: "this month to date" };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireRole("manager");
  const params = await searchParams;
  const selectedKey = params.report && REPORTS.some((r) => r.key === params.report) ? params.report : REPORTS[0]!.key;
  const def = REPORTS.find((r) => r.key === selectedKey)!;
  const { period, label } = periodFor(params.period ?? "month");
  const filters = { owner: params.owner, branch: params.branch };

  const supabase = await createClient();
  const [result, { data: owners }, { data: branches }] = await Promise.all([
    def.run(period, filters),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
  ]);

  const qs = (extra: Record<string, string | undefined>) => {
    const merged = { ...params, ...extra };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, String(v));
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  const subtitle = def.periodic ? `${def.description} — ${label}` : `${def.description} — live snapshot`;

  return (
    <div>
      <PageHeader
        eyebrow="Management information"
        title="Reports"
        subtitle="Build, filter, sort and export any report"
      />
      <LinkTabs
        className="mb-4"
        tabs={[
          { label: "Management", href: "/reporting", exact: true },
          { label: "Reports", href: "/reporting/reports" },
          { label: "Email marketing", href: "/reporting/email" },
          { label: "Activity feed", href: "/reporting/activity" },
        ]}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {REPORTS.map((r) => (
          <Link
            key={r.key}
            href={`/reporting/reports${qs({ report: r.key })}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
              r.key === selectedKey
                ? "border-gold bg-gold-tint text-gold-deep"
                : "border-line text-fg-2 hover:bg-surface-2",
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <ReportingFilters owners={owners ?? []} branches={branches ?? []} />

      <div className="mt-5">
        <h2 className="text-lg font-extrabold text-fg-1">{def.label}</h2>
        <p className="mb-3 text-sm text-fg-3">{subtitle}</p>
        <ReportView
          title={def.label}
          subtitle={subtitle}
          filename={`${def.key}-report`}
          columns={result.columns}
          rows={result.rows}
        />
      </div>
    </div>
  );
}
