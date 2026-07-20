import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import { AddSuppressionForm } from "./add-suppression";

export const metadata = { title: "Suppressions" };

export default async function SuppressionsPage() {
  const supabase = await createClient();
  const { data: suppressions, count } = await supabase
    .from("suppressions")
    .select("id, email, reason, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(200);

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
                <th className="px-5 py-2.5">Email</th>
                <th className="px-3 py-2.5">Reason</th>
                <th className="px-3 py-2.5">Added</th>
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
