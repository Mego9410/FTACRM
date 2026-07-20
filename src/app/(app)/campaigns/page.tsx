import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { emailSendingEnabled } from "@/lib/email/provider";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge, Button, Card, EmptyState } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import { resolveSort, applySort, type SortOptions } from "@/lib/sort";
import { SortHeader } from "@/components/ui/sortable";

export const metadata = { title: "Campaigns" };

const STATUS_TONES: Record<string, "neutral" | "gold" | "green" | "danger"> = {
  draft: "neutral",
  scheduled: "gold",
  sending: "gold",
  sent: "green",
  cancelled: "danger",
};

const SORT_OPTIONS: SortOptions = {
  campaign: { column: "name" },
  status: { column: "status" },
  recipients: { column: "recipient_count", nullsFirst: false },
  opens: { column: "open_count", nullsFirst: false },
  clicks: { column: "click_count", nullsFirst: false },
  created: { column: "created_at" },
};

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const sort = resolveSort(params, SORT_OPTIONS, { key: "created", dir: "desc" });
  const supabase = await createClient();
  const { data: campaigns } = await applySort(
    supabase
      .from("campaigns")
      .select(
        "id, name, status, subject, recipient_count, sent_count, open_count, click_count, created_at, started_at, profiles!campaigns_created_by_fkey(full_name)",
      ),
    sort,
  ).limit(100);

  const sendingEnabled = emailSendingEnabled();

  return (
    <div>
      <PageHeader
        eyebrow="Communications" title="Campaigns"
        subtitle="Bulk email to segmented buyer and seller audiences"
        actions={
          <Link href="/campaigns/new">
            <Button>New campaign</Button>
          </Link>
        }
      />

      {!sendingEnabled ? (
        <div className="mb-4 rounded-sm border border-warn/30 bg-warn-bg px-4 py-2.5 text-sm font-semibold text-warn">
          No email provider is linked to this deployment — campaigns can be built, segmented and
          previewed, but not dispatched. Linking Resend later enables sending without code changes.
        </div>
      ) : null}

      <LinkTabs
        className="mb-4"
        tabs={[
          { label: "Campaigns", href: "/campaigns", exact: true },
          { label: "Templates", href: "/campaigns/templates" },
          { label: "Suppressions", href: "/campaigns/suppressions" },
        ]}
      />

      {(campaigns ?? []).length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          body="Build your first campaign — pick an audience, write the email, preview with real data."
          action={
            <Link href="/campaigns/new">
              <Button size="sm">New campaign</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-fg-3">
                <SortHeader label="Campaign" sortKey="campaign" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/campaigns" className="px-5" />
                <SortHeader label="Status" sortKey="status" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/campaigns" />
                <SortHeader label="Recipients" sortKey="recipients" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/campaigns" />
                <SortHeader label="Opens" sortKey="opens" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/campaigns" />
                <SortHeader label="Clicks" sortKey="clicks" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/campaigns" />
                <SortHeader label="Created" sortKey="created" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/campaigns" />
              </tr>
            </thead>
            <tbody>
              {(campaigns ?? []).map((c) => {
                const author = c.profiles as unknown as { full_name: string } | null;
                return (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                    <td className="px-5 py-2.5">
                      <Link href={`/campaigns/${c.id}`} className="font-semibold text-fg-1 hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-fg-3">{c.subject ?? "No subject yet"}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={STATUS_TONES[c.status] ?? "neutral"} className="capitalize">{c.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5">{c.recipient_count || "—"}</td>
                    <td className="px-3 py-2.5">{c.open_count || "—"}</td>
                    <td className="px-3 py-2.5">{c.click_count || "—"}</td>
                    <td className="px-3 py-2.5 text-fg-3">
                      {formatDateTime(c.created_at)}
                      {author ? ` · ${author.full_name}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
</div>
        </Card>
      )}
    </div>
  );
}
