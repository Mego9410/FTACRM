import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import { CampaignActions } from "./campaign-actions";
import { MessageEditor } from "./message-editor";

const STATUS_TONES: Record<string, "neutral" | "gold" | "green" | "danger"> = {
  draft: "neutral",
  scheduled: "gold",
  sending: "gold",
  sent: "green",
  cancelled: "danger",
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: campaign }, { data: recipients }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("campaign_recipients")
      .select("id, email, status, sent_at, contacts!campaign_recipients_contact_id_fkey(id, first_name, last_name, company_name)")
      .eq("campaign_id", id)
      .order("created_at")
      .limit(500),
  ]);
  if (!campaign) notFound();

  const tiles = [
    { label: "Recipients", value: campaign.recipient_count },
    { label: "Sent", value: campaign.sent_count },
    { label: "Delivered", value: campaign.delivered_count },
    { label: "Opened", value: campaign.open_count },
    { label: "Clicked", value: campaign.click_count },
    { label: "Bounced", value: campaign.bounce_count },
    { label: "Unsubscribed", value: campaign.unsubscribe_count },
  ];

  return (
    <div>
      <PageHeader
        title={campaign.name}
        subtitle={
          <>
            <Badge tone={STATUS_TONES[campaign.status] ?? "neutral"} className="mr-2 capitalize">{campaign.status}</Badge>
            {campaign.subject ?? "No subject"}
            {campaign.started_at ? ` · queued ${formatDateTime(campaign.started_at)}` : ""}
          </>
        }
        actions={<CampaignActions campaignId={id} status={campaign.status} />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map((t) => (
          <Card key={t.label} className="px-4 py-3 text-center">
            <p className="text-[22px] font-extrabold text-fg-1">{t.value ?? 0}</p>
            <p className="text-xs font-semibold text-fg-3">{t.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <MessageEditor
          campaignId={id}
          kind={campaign.kind ?? "campaign"}
          subject={campaign.subject}
          bodyHtml={campaign.body_html}
          editable={campaign.sent_count === 0 && ["draft", "scheduled", "sending"].includes(campaign.status)}
        />

        <Card className="flex h-full flex-col">
          <CardHeader title={`Recipients ${recipients && recipients.length >= 500 ? "(first 500)" : `(${recipients?.length ?? 0})`}`} />
          {(recipients ?? []).length === 0 ? (
            <p className="px-5 py-6 text-sm text-fg-3">
              Recipients are snapshotted when the campaign is queued for sending.
            </p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-fg-3">
                    <th className="px-5 py-2">Recipient</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {(recipients ?? []).map((r) => {
                    const c = r.contacts as unknown as {
                      id: string;
                      first_name: string | null;
                      last_name: string | null;
                      company_name: string | null;
                    } | null;
                    const name = c
                      ? [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || r.email
                      : r.email;
                    return (
                      <tr key={r.id} className="border-b border-line last:border-0">
                        <td className="px-5 py-2">
                          {c ? (
                            <Link href={`/contacts/${c.id}`} className="font-semibold text-fg-1 hover:underline">
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                          <span className="ml-2 text-xs text-fg-4">{r.email}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            tone={
                              r.status === "delivered" || r.status === "sent"
                                ? "green"
                                : r.status === "queued"
                                  ? "gold"
                                  : r.status === "bounced" || r.status === "failed"
                                    ? "danger"
                                    : "neutral"
                            }
                            className="capitalize"
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-fg-3">{r.sent_at ? formatDateTime(r.sent_at) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
