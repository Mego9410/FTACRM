import { requireProfile } from "@/lib/auth";
import { computeMonthlyFigures } from "@/lib/monthly-figures";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Card, CardHeader } from "@/components/ui/primitives";
import { formatGBP } from "@/lib/utils";
import { MonthlyToolbar } from "./monthly-toolbar";

export const metadata = { title: "Monthly figures" };

type Search = { month?: string };

/** Current month as YYYY-MM (UTC) — the default when none is selected. */
function defaultMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function MonthlyFiguresPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireProfile();
  const params = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : defaultMonth();
  const figures = await computeMonthlyFigures(month);

  return (
    <div>
      <PageHeader eyebrow="Management information" title="Monthly figures" subtitle={`End-of-month figures — ${figures.label}`} />
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
      <MonthlyToolbar figures={figures} />

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {figures.sections.map((section) => (
          <Card key={section.title} className="break-inside-avoid">
            <CardHeader title={section.title} />
            <table className="w-full text-sm">
              <tbody>
                {section.rows.map((row, i) => (
                  <tr key={row.label} className={i % 2 ? "bg-surface-2/40" : ""}>
                    <td className="px-5 py-2 text-fg-2">{row.label}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-fg-1">{row.value.toLocaleString("en-GB")}</td>
                    <td className="px-5 py-2 text-right text-xs tabular-nums text-gold-deep">
                      {row.money != null ? formatGBP(row.money) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
    </div>
  );
}
