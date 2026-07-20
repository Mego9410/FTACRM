import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import { resolveSort, applySort, type SortOptions } from "@/lib/sort";
import { SortHeader } from "@/components/ui/sortable";
import { AddSuppressionForm } from "./add-suppression";

export const metadata = { title: "Suppressions" };

const SORT_OPTIONS: SortOptions = {
  email: { column: "email" },
  reason: { column: "reason", nullsFirst: false },
  added: { column: "created_at" },
};

export default async function SuppressionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const sort = resolveSort(params, SORT_OPTIONS, { key: "added", dir: "desc" });
  const supabase = await createClient();
  const { data: suppressions, count } = await applySort(
    supabase.from("suppressions").select("id, email, reason, created_at", { count: "exact" }),
    sort,
  ).limit(200);

  return (
    <div>
      <PageHeader
        eyebrow="Communications" title="Campaigns"
        subtitle="Addresses that must never receive bulk email — unsubscribes, bounces, complaints and manual blocks"
      />
      <LinkTabs
        className="mb-4"
        tabs={[
          { label: "Campaigns", href: "/campaigns", exact: true },
          { label: "Templates", href: "/campaigns/templates" },
          { label: "Suppressions", href: "/campaigns/suppressions" },
        ]}
      />
      <Card>
        <CardHeader title={`Suppression list (${count ?? 0})`} action={<AddSuppressionForm />} />
        {(suppressions ?? []).length === 0 ? (
          <EmptyState className="m-4" title="No suppressed addresses" body="Unsubscribes and hard bounces land here automatically once sending is linked." />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-fg-3">
                <SortHeader label="Email" sortKey="email" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/campaigns/suppressions" className="px-5" />
                <SortHeader label="Reason" sortKey="reason" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/campaigns/suppressions" />
                <SortHeader label="Added" sortKey="added" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/campaigns/suppressions" />
              </tr>
            </thead>
            <tbody>
              {(suppressions ?? []).map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5 font-medium text-fg-1">{s.email}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={s.reason === "manual" ? "neutral" : "danger"} className="capitalize">
                      {s.reason.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-fg-3">{formatDateTime(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        )}
      </Card>
    </div>
  );
}
