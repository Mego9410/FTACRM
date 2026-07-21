import { createClient } from "@/lib/supabase/server";
import type { Period } from "@/lib/reporting";

export type EmailKpis = {
  sends: number;
  recipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  deliveryRate: number | null;
  openRate: number | null;
  clickRate: number | null;
  bounceRate: number | null;
  unsubscribeRate: number | null;
};

type CampaignCounters = {
  recipient_count: number | null;
  sent_count: number | null;
  delivered_count: number | null;
  open_count: number | null;
  click_count: number | null;
  bounce_count: number | null;
  unsubscribe_count: number | null;
};

function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function summarise(rows: CampaignCounters[]): EmailKpis {
  const sum = (k: keyof CampaignCounters) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const recipients = sum("recipient_count");
  const sent = sum("sent_count");
  const delivered = sum("delivered_count");
  const opened = sum("open_count");
  const clicked = sum("click_count");
  const bounced = sum("bounce_count");
  const unsubscribed = sum("unsubscribe_count");
  // Opens/clicks are measured against delivered where we have it, falling
  // back to sent (delivered tracking depends on the provider webhook).
  const engagementBase = delivered || sent;
  return {
    sends: rows.length,
    recipients,
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    unsubscribed,
    deliveryRate: pct(delivered, sent),
    openRate: pct(opened, engagementBase),
    clickRate: pct(clicked, engagementBase),
    bounceRate: pct(bounced, sent),
    unsubscribeRate: pct(unsubscribed, engagementBase),
  };
}

/** Campaigns/launches created within the period, excluding untouched drafts. */
async function loadCampaigns(period: Period, kind?: "campaign" | "launch") {
  const supabase = await createClient();
  let q = supabase
    .from("campaigns")
    .select("recipient_count, sent_count, delivered_count, open_count, click_count, bounce_count, unsubscribe_count")
    .neq("status", "draft")
    .gte("created_at", period.from.toISOString())
    .lte("created_at", period.to.toISOString());
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return data ?? [];
}

export async function computeEmailKpis(period: Period, kind?: "campaign" | "launch"): Promise<EmailKpis> {
  return summarise(await loadCampaigns(period, kind));
}

export type KindBreakdown = EmailKpis & { kind: "launch" | "campaign" };

/** Same KPI set split by launch vs ordinary campaign, for a side-by-side comparison. */
export async function emailBreakdownByKind(period: Period): Promise<KindBreakdown[]> {
  const [launch, campaign] = await Promise.all([
    computeEmailKpis(period, "launch"),
    computeEmailKpis(period, "campaign"),
  ]);
  return [
    { kind: "launch", ...launch },
    { kind: "campaign", ...campaign },
  ];
}

export type EmailMonthPoint = { month: string; sent: number; opened: number };

/** Sent vs opened per month, trailing 12 months (chart data). */
export async function emailVolumeByMonth(): Promise<EmailMonthPoint[]> {
  const supabase = await createClient();
  const from = new Date();
  from.setMonth(from.getMonth() - 11);
  from.setDate(1);
  const { data } = await supabase
    .from("campaigns")
    .select("created_at, sent_count, open_count")
    .neq("status", "draft")
    .gte("created_at", from.toISOString());

  const buckets = new Map<string, { sent: number; opened: number }>();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, { sent: 0, opened: 0 });
  }
  for (const row of data ?? []) {
    if (!row.created_at) continue;
    const bucket = buckets.get(row.created_at.slice(0, 7));
    if (bucket) {
      bucket.sent += Number(row.sent_count ?? 0);
      bucket.opened += Number(row.open_count ?? 0);
    }
  }
  return [...buckets.entries()].map(([month, v]) => ({
    month: new Date(`${month}-01`).toLocaleDateString("en-GB", { month: "short" }),
    ...v,
  }));
}

export type SuppressionBreakdown = { total: number; byReason: { reason: string; count: number }[] };

/** Running (all-time) do-not-email list, by reason — not period-bound. */
export async function suppressionBreakdown(): Promise<SuppressionBreakdown> {
  const supabase = await createClient();
  const { data } = await supabase.from("suppressions").select("reason");
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.reason, (counts.get(row.reason) ?? 0) + 1);
  return {
    total: data?.length ?? 0,
    byReason: [...counts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}
