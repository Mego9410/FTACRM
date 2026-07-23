import { formatGBP } from "@/lib/utils";

/** The 15 key numbers a user can choose from for the dashboard's top strip. */
export type MetricId =
  | "open_tasks"
  | "overdue_tasks"
  | "live_deals"
  | "pipeline_value"
  | "valuations_week"
  | "completions_month"
  | "completions_year"
  | "available_practices"
  | "under_offer"
  | "new_instructions_month"
  | "buyer_pool"
  | "hot_buyers"
  | "viewings_week"
  | "offers_pending"
  | "contracts_expiring";

/** Raw numbers computed server-side; every metric reads from this map. */
export type Metrics = Record<MetricId, number>;

type SubTone = "muted" | "gold" | "green" | "danger";

export type MetricDef = {
  id: MetricId;
  label: string;
  href: string;
  value: (m: Metrics) => string;
  sub: (m: Metrics) => { text: string; tone: SubTone };
};

const n = (v: number) => v.toLocaleString("en-GB");

export const METRICS: MetricDef[] = [
  {
    id: "open_tasks",
    label: "Open tasks",
    href: "/tasks",
    value: (m) => n(m.open_tasks),
    sub: (m) => ({ text: `${m.overdue_tasks} overdue`, tone: m.overdue_tasks > 0 ? "danger" : "muted" }),
  },
  {
    id: "overdue_tasks",
    label: "Overdue tasks",
    href: "/tasks",
    value: (m) => n(m.overdue_tasks),
    sub: () => ({ text: "need chasing", tone: "danger" }),
  },
  {
    id: "live_deals",
    label: "Deals in progress",
    href: "/deals",
    value: (m) => n(m.live_deals),
    sub: (m) => ({ text: formatGBP(m.pipeline_value, { compact: true }), tone: "gold" }),
  },
  {
    id: "pipeline_value",
    label: "Pipeline value",
    href: "/deals",
    value: (m) => formatGBP(m.pipeline_value, { compact: true }),
    sub: () => ({ text: "in progress", tone: "gold" }),
  },
  {
    id: "valuations_week",
    label: "Valuations this week",
    href: "/practices?status=valuation",
    value: (m) => n(m.valuations_week),
    sub: () => ({ text: "booked", tone: "muted" }),
  },
  {
    id: "completions_month",
    label: "Completions",
    href: "/deals?status=completed",
    value: (m) => n(m.completions_month),
    sub: () => ({ text: "this month", tone: "green" }),
  },
  {
    id: "completions_year",
    label: "Completions",
    href: "/deals?status=completed",
    value: (m) => n(m.completions_year),
    sub: () => ({ text: "this year", tone: "green" }),
  },
  {
    id: "available_practices",
    label: "Practices available",
    href: "/practices?status=live",
    value: (m) => n(m.available_practices),
    sub: () => ({ text: "on the market", tone: "muted" }),
  },
  {
    id: "under_offer",
    label: "Under offer",
    href: "/practices?status=live",
    value: (m) => n(m.under_offer),
    sub: () => ({ text: "practices", tone: "muted" }),
  },
  {
    id: "new_instructions_month",
    label: "New instructions",
    href: "/practices",
    value: (m) => n(m.new_instructions_month),
    sub: () => ({ text: "this month", tone: "muted" }),
  },
  {
    id: "buyer_pool",
    label: "Buyer pool",
    href: "/contacts?role=buyer",
    value: (m) => n(m.buyer_pool),
    sub: () => ({ text: "registered", tone: "muted" }),
  },
  {
    id: "hot_buyers",
    label: "Hot buyers",
    href: "/contacts?role=buyer&temperature=hot",
    value: (m) => n(m.hot_buyers),
    sub: () => ({ text: "ready to move", tone: "danger" }),
  },
  {
    id: "viewings_week",
    label: "Viewings this week",
    href: "/practices",
    value: (m) => n(m.viewings_week),
    sub: () => ({ text: "scheduled", tone: "muted" }),
  },
  {
    id: "offers_pending",
    label: "Offers pending",
    href: "/practices",
    value: (m) => n(m.offers_pending),
    sub: () => ({ text: "awaiting decision", tone: "gold" }),
  },
  {
    id: "contracts_expiring",
    label: "Renewals due",
    href: "/practices",
    value: (m) => n(m.contracts_expiring),
    sub: () => ({ text: "contracts expiring", tone: "danger" }),
  },
];

export const METRIC_BY_ID: Record<MetricId, MetricDef> = Object.fromEntries(
  METRICS.map((m) => [m.id, m]),
) as Record<MetricId, MetricDef>;

export const MAX_KEY_NUMBERS = 6;

export const DEFAULT_KEY_NUMBERS: MetricId[] = [
  "open_tasks",
  "live_deals",
  "valuations_week",
  "completions_month",
  "available_practices",
  "buyer_pool",
];

/** Coerce arbitrary stored input into a valid, deduped, capped selection. */
export function normaliseKeyNumbers(input: unknown): MetricId[] {
  if (!Array.isArray(input)) return DEFAULT_KEY_NUMBERS;
  const seen = new Set<MetricId>();
  for (const v of input) {
    if (typeof v === "string" && v in METRIC_BY_ID) seen.add(v as MetricId);
    if (seen.size >= MAX_KEY_NUMBERS) break;
  }
  return seen.size > 0 ? [...seen] : DEFAULT_KEY_NUMBERS;
}
