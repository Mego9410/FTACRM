import { createClient } from "@/lib/supabase/server";
import { getLookupIndex } from "@/lib/lookups";
import type { Period } from "@/lib/reporting";

export type ReportColumn = {
  key: string;
  label: string;
  type?: "text" | "number" | "money" | "date" | "datetime";
};
export type ReportResult = { columns: ReportColumn[]; rows: Record<string, string | number | null>[] };
export type ReportDef = {
  key: string;
  label: string;
  description: string;
  /** true if this report is bounded by the selected period; false = live snapshot ignoring period */
  periodic: boolean;
  run: (period: Period) => Promise<ReportResult>;
};

// ---- helpers -----------------------------------------------------------------

/** Inclusive date-only bounds ("YYYY-MM-DD") for date columns. */
function dateBounds(period: Period) {
  return { from: period.from.toISOString().slice(0, 10), to: period.to.toISOString().slice(0, 10) };
}

/** Full ISO bounds for timestamptz columns. */
function tsBounds(period: Period) {
  return { from: period.from.toISOString(), to: period.to.toISOString() };
}

/** Estimated fee from a practice's fee configuration and a sale price. */
function estimatedFee(
  practice: { fee_percent?: number | null; fee_fixed?: number | null } | null | undefined,
  price: number,
): number {
  if (practice?.fee_percent) return (price * Number(practice.fee_percent)) / 100;
  if (practice?.fee_fixed) return Number(practice.fee_fixed);
  return 0;
}

/** Build a contact display name from first/last/company, or null. */
function contactName(
  c: { first_name: string | null; last_name: string | null; company_name: string | null } | null | undefined,
): string | null {
  if (!c) return null;
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || null;
}

type PracticeJoin = {
  display_title: string | null;
  town: string | null;
  fee_percent?: number | null;
  fee_fixed?: number | null;
} | null;

type StageJoin = { label: string | null } | null;
type ContactJoin = {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
} | null;

// ---- reports -----------------------------------------------------------------

const completions: ReportDef = {
  key: "completions",
  label: "Completions",
  description: "Deals that completed within the selected period, with the fee banked.",
  periodic: true,
  async run(period) {
    const supabase = await createClient();
    const { from, to } = dateBounds(period);
    const { data } = await supabase
      .from("deals")
      .select(
        "ref, agreed_price, completed_at, created_at, practices!deals_practice_id_fkey(display_title, town, fee_percent, fee_fixed), contacts!deals_buyer_contact_id_fkey(first_name, last_name, company_name)",
      )
      .eq("status", "completed")
      .gte("completed_at", from)
      .lte("completed_at", to);

    const rows = (data ?? []).map((d) => {
      const practice = d.practices as unknown as PracticeJoin;
      const buyer = d.contacts as unknown as ContactJoin;
      const price = Number(d.agreed_price ?? 0);
      const days =
        d.completed_at && d.created_at
          ? Math.round((new Date(d.completed_at).getTime() - new Date(d.created_at).getTime()) / 86_400_000)
          : null;
      return {
        ref: d.ref ?? null,
        practice: practice?.display_title ?? null,
        town: practice?.town ?? null,
        buyer: contactName(buyer),
        agreed_price: d.agreed_price != null ? price : null,
        fee: estimatedFee(practice, price),
        completed: d.completed_at ?? null,
        days_to_complete: days,
      };
    });

    return {
      columns: [
        { key: "ref", label: "Ref", type: "text" },
        { key: "practice", label: "Practice", type: "text" },
        { key: "town", label: "Town", type: "text" },
        { key: "buyer", label: "Buyer", type: "text" },
        { key: "agreed_price", label: "Agreed price", type: "money" },
        { key: "fee", label: "Fee", type: "money" },
        { key: "completed", label: "Completed", type: "date" },
        { key: "days_to_complete", label: "Days to complete", type: "number" },
      ],
      rows,
    };
  },
};

const pipeline: ReportDef = {
  key: "pipeline",
  label: "Live pipeline",
  description: "All in-progress deals as they stand right now (a live snapshot, not period-bound).",
  periodic: false,
  async run() {
    const supabase = await createClient();
    const { data } = await supabase
      .from("deals")
      .select(
        "ref, agreed_price, target_completion_date, last_activity_at, practices!deals_practice_id_fkey(display_title, fee_percent, fee_fixed), deal_stages!deals_current_stage_id_fkey(label)",
      )
      .eq("status", "in_progress");

    const rows = (data ?? []).map((d) => {
      const practice = d.practices as unknown as PracticeJoin;
      const stage = d.deal_stages as unknown as StageJoin;
      const price = Number(d.agreed_price ?? 0);
      return {
        ref: d.ref ?? null,
        practice: practice?.display_title ?? null,
        stage: stage?.label ?? null,
        agreed_price: d.agreed_price != null ? price : null,
        est_fee: estimatedFee(practice, price),
        target_completion: d.target_completion_date ?? null,
        last_activity: d.last_activity_at ?? null,
      };
    });

    return {
      columns: [
        { key: "ref", label: "Ref", type: "text" },
        { key: "practice", label: "Practice", type: "text" },
        { key: "stage", label: "Stage", type: "text" },
        { key: "agreed_price", label: "Agreed price", type: "money" },
        { key: "est_fee", label: "Est. fee", type: "money" },
        { key: "target_completion", label: "Target completion", type: "date" },
        { key: "last_activity", label: "Last activity", type: "date" },
      ],
      rows,
    };
  },
};

const instructions: ReportDef = {
  key: "instructions",
  label: "Instructions taken",
  description: "Practices instructed (put on the market) within the selected period.",
  periodic: true,
  async run(period) {
    const supabase = await createClient();
    const { from, to } = dateBounds(period);
    const idx = await getLookupIndex();
    const { data } = await supabase
      .from("practices")
      .select(
        "ref, display_title, town, status, asking_price, funding_type_id, surgeries, fee_percent, instructed_at",
      )
      .gte("instructed_at", from)
      .lte("instructed_at", to);

    const rows = (data ?? []).map((p) => {
      return {
        ref: p.ref ?? null,
        practice: p.display_title ?? null,
        town: p.town ?? null,
        status: p.status ?? null,
        asking_price: p.asking_price != null ? Number(p.asking_price) : null,
        funding: p.funding_type_id ? idx.get(p.funding_type_id)?.value ?? null : null,
        surgeries: p.surgeries != null ? Number(p.surgeries) : null,
        fee_percent: p.fee_percent != null ? Number(p.fee_percent) : null,
        instructed: p.instructed_at ?? null,
      };
    });

    return {
      columns: [
        { key: "ref", label: "Ref", type: "text" },
        { key: "practice", label: "Practice", type: "text" },
        { key: "town", label: "Town", type: "text" },
        { key: "status", label: "Status", type: "text" },
        { key: "asking_price", label: "Asking price", type: "money" },
        { key: "funding", label: "Funding", type: "text" },
        { key: "surgeries", label: "Surgeries", type: "number" },
        { key: "fee_percent", label: "Fee %", type: "number" },
        { key: "instructed", label: "Instructed", type: "date" },
      ],
      rows,
    };
  },
};

const valuations: ReportDef = {
  key: "valuations",
  label: "Valuations",
  description: "Valuation appointments scheduled within the selected period.",
  periodic: true,
  async run(period) {
    const supabase = await createClient();
    const { from, to } = tsBounds(period);
    const { data } = await supabase
      .from("valuations")
      .select(
        "appointment_at, suggested_price, price_from, price_to, outcome, created_at, practices!valuations_practice_id_fkey(display_title)",
      )
      .gte("appointment_at", from)
      .lte("appointment_at", to);

    const rows = (data ?? [])
      .map((v) => {
        const practice = v.practices as unknown as PracticeJoin;
        return {
          practice: practice?.display_title ?? null,
          appointment: v.appointment_at ?? null,
          suggested_price: v.suggested_price != null ? Number(v.suggested_price) : null,
          price_from: v.price_from != null ? Number(v.price_from) : null,
          price_to: v.price_to != null ? Number(v.price_to) : null,
          outcome: v.outcome ?? null,
          created: v.created_at ?? null,
        };
      });

    return {
      columns: [
        { key: "practice", label: "Practice", type: "text" },
        { key: "appointment", label: "Appointment", type: "datetime" },
        { key: "suggested_price", label: "Suggested price", type: "money" },
        { key: "price_from", label: "Price from", type: "money" },
        { key: "price_to", label: "Price to", type: "money" },
        { key: "outcome", label: "Outcome", type: "text" },
        { key: "created", label: "Created", type: "date" },
      ],
      rows,
    };
  },
};

const offers: ReportDef = {
  key: "offers",
  label: "Offers",
  description: "Offers received within the selected period.",
  periodic: true,
  async run(period) {
    const supabase = await createClient();
    const { from, to } = dateBounds(period);
    // offer_date is a date; fall back to created_at when null. Query both windows.
    const { data } = await supabase
      .from("offers")
      .select(
        "amount, status, finance_status, offer_date, created_at, practices!offers_practice_id_fkey(display_title), contacts!offers_buyer_contact_id_fkey(first_name, last_name, company_name)",
      )
      .or(`and(offer_date.gte.${from},offer_date.lte.${to}),and(offer_date.is.null,created_at.gte.${period.from.toISOString()},created_at.lte.${period.to.toISOString()})`);

    const rows = (data ?? [])
      .map((o) => {
        const practice = o.practices as unknown as PracticeJoin;
        const buyer = o.contacts as unknown as ContactJoin;
        return {
          practice: practice?.display_title ?? null,
          buyer: contactName(buyer),
          amount: o.amount != null ? Number(o.amount) : null,
          status: o.status ?? null,
          finance: o.finance_status ?? null,
          offer_date: o.offer_date ?? o.created_at ?? null,
        };
      });

    return {
      columns: [
        { key: "practice", label: "Practice", type: "text" },
        { key: "buyer", label: "Buyer", type: "text" },
        { key: "amount", label: "Amount", type: "money" },
        { key: "status", label: "Status", type: "text" },
        { key: "finance", label: "Finance", type: "text" },
        { key: "offer_date", label: "Offer date", type: "date" },
      ],
      rows,
    };
  },
};

const fallThroughs: ReportDef = {
  key: "fall_throughs",
  label: "Fall-throughs",
  description: "Deals that fell through within the selected period, with the recorded reason.",
  periodic: true,
  async run(period) {
    const supabase = await createClient();
    const { from, to } = dateBounds(period);
    const idx = await getLookupIndex();
    const { data } = await supabase
      .from("deals")
      .select(
        "ref, agreed_price, fall_through_reason_id, fell_through_at, practices!deals_practice_id_fkey(display_title)",
      )
      .eq("status", "fallen_through")
      .gte("fell_through_at", from)
      .lte("fell_through_at", to);

    const rows = (data ?? []).map((d) => {
      const practice = d.practices as unknown as PracticeJoin;
      return {
        ref: d.ref ?? null,
        practice: practice?.display_title ?? null,
        reason: d.fall_through_reason_id ? idx.get(d.fall_through_reason_id)?.value ?? null : null,
        agreed_price: d.agreed_price != null ? Number(d.agreed_price) : null,
        fell_through: d.fell_through_at ?? null,
      };
    });

    return {
      columns: [
        { key: "ref", label: "Ref", type: "text" },
        { key: "practice", label: "Practice", type: "text" },
        { key: "reason", label: "Reason", type: "text" },
        { key: "agreed_price", label: "Agreed price", type: "money" },
        { key: "fell_through", label: "Fell through", type: "date" },
      ],
      rows,
    };
  },
};

const emailSends: ReportDef = {
  key: "email_sends",
  label: "Email sends",
  description: "Every campaign and launch created within the period, with delivery and engagement stats.",
  periodic: true,
  async run(period) {
    const supabase = await createClient();
    const { from, to } = tsBounds(period);
    const { data } = await supabase
      .from("campaigns")
      .select(
        "name, kind, status, recipient_count, sent_count, delivered_count, open_count, click_count, bounce_count, unsubscribe_count, scheduled_at, started_at, completed_at, created_at, practices!campaigns_practice_id_fkey(ref, display_title)",
      )
      .neq("status", "draft")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false });

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

    const rows = (data ?? []).map((c) => {
      const practice = c.practices as unknown as { ref: string; display_title: string } | null;
      const sent = Number(c.sent_count ?? 0);
      const delivered = Number(c.delivered_count ?? 0);
      const opened = Number(c.open_count ?? 0);
      const clicked = Number(c.click_count ?? 0);
      const bounced = Number(c.bounce_count ?? 0);
      const unsubscribed = Number(c.unsubscribe_count ?? 0);
      const engagementBase = delivered || sent;
      return {
        name: c.name,
        kind: c.kind === "launch" ? "Launch" : "Campaign",
        practice: practice ? `${practice.display_title} (${practice.ref})` : null,
        status: c.status,
        recipients: c.recipient_count != null ? Number(c.recipient_count) : null,
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        unsubscribed,
        delivery_rate: pct(delivered, sent),
        open_rate: pct(opened, engagementBase),
        click_rate: pct(clicked, engagementBase),
        bounce_rate: pct(bounced, sent),
        unsub_rate: pct(unsubscribed, engagementBase),
        sent_at: c.started_at ?? c.scheduled_at ?? c.created_at ?? null,
      };
    });

    return {
      columns: [
        { key: "name", label: "Name", type: "text" },
        { key: "kind", label: "Kind", type: "text" },
        { key: "practice", label: "Practice", type: "text" },
        { key: "status", label: "Status", type: "text" },
        { key: "recipients", label: "Recipients", type: "number" },
        { key: "sent", label: "Sent", type: "number" },
        { key: "delivered", label: "Delivered", type: "number" },
        { key: "delivery_rate", label: "Delivery %", type: "number" },
        { key: "opened", label: "Opened", type: "number" },
        { key: "open_rate", label: "Open %", type: "number" },
        { key: "clicked", label: "Clicked", type: "number" },
        { key: "click_rate", label: "Click %", type: "number" },
        { key: "bounced", label: "Bounced", type: "number" },
        { key: "bounce_rate", label: "Bounce %", type: "number" },
        { key: "unsubscribed", label: "Unsubscribed", type: "number" },
        { key: "unsub_rate", label: "Unsub %", type: "number" },
        { key: "sent_at", label: "Sent / scheduled", type: "datetime" },
      ],
      rows,
    };
  },
};

export const REPORTS: ReportDef[] = [
  completions,
  pipeline,
  instructions,
  valuations,
  offers,
  fallThroughs,
  emailSends,
];
