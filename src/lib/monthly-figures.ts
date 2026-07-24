import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { monthBounds, type FigureSection, type MonthlyFigures } from "@/lib/monthly-figures-utils";

export { monthBounds };
export type { FigureRow, FigureSection, MonthlyFigures } from "@/lib/monthly-figures-utils";

async function count(
  build: () => PromiseLike<{ count: number | null }>,
): Promise<number> {
  const { count: c } = await build();
  return c ?? 0;
}

/**
 * Compute the End-of-Month figures for `month` (YYYY-MM). Snapshot rows reflect
 * the state right now; "in month" rows are bounded by the selected month.
 */
export async function computeMonthlyFigures(month: string): Promise<MonthlyFigures> {
  const supabase = await createClient();
  const { fromDate, toDate, label } = monthBounds(month);
  const fromTs = `${fromDate}T00:00:00Z`;
  const toTs = `${toDate}T00:00:00Z`;

  const [valuationKinds, membershipTiers, referralCategories] = await Promise.all([
    getLookup("valuation_kind"),
    getLookup("membership_tier"),
    getLookup("referral_category"),
  ]);
  const kindId = (key: string) => valuationKinds.find((k) => k.system_key === key)?.id ?? null;

  // ── Valuations in month, split by kind ────────────────────────────────
  const { data: vals } = await supabase
    .from("valuations")
    .select("kind_id")
    .gte("appointment_at", fromTs)
    .lt("appointment_at", toTs);
  const valuationId = kindId("valuation");
  const desktopId = kindId("desktop");
  const updateId = kindId("update");
  let valuationsInMonth = 0;
  let desktops = 0;
  let updates = 0;
  for (const v of (vals ?? []) as { kind_id: string | null }[]) {
    if (v.kind_id === desktopId) desktops += 1;
    else if (v.kind_id === updateId) updates += 1;
    else valuationsInMonth += 1; // valuation kind or unset (legacy) counts as a valuation
  }
  void valuationId;

  // ── Buyer membership tallies (current snapshot) ───────────────────────
  const { data: buyers } = await supabase
    .from("contacts")
    .select("membership_tier_id")
    .contains("roles", ["buyer"])
    .is("archived_at", null);
  const tierCount = new Map<string, number>();
  let totalMembers = 0;
  for (const b of (buyers ?? []) as { membership_tier_id: string | null }[]) {
    if (b.membership_tier_id) {
      tierCount.set(b.membership_tier_id, (tierCount.get(b.membership_tier_id) ?? 0) + 1);
      totalMembers += 1;
    }
  }
  const tierValue = (key: string) => {
    const id = membershipTiers.find((t) => t.system_key === key)?.id;
    return id ? tierCount.get(id) ?? 0 : 0;
  };

  // ── Referrals in month, per type + total ──────────────────────────────
  const { data: refs } = await supabase
    .from("referrals")
    .select("category_id, value")
    .gte("referred_on", fromDate)
    .lt("referred_on", toDate);
  const refCount = new Map<string, { n: number; sum: number }>();
  let refTotal = 0;
  let refTotalValue = 0;
  for (const r of (refs ?? []) as { category_id: string | null; value: number | null }[]) {
    if (!r.category_id) continue;
    const cur = refCount.get(r.category_id) ?? { n: 0, sum: 0 };
    cur.n += 1;
    cur.sum += Number(r.value ?? 0);
    refCount.set(r.category_id, cur);
    refTotal += 1;
    refTotalValue += Number(r.value ?? 0);
  }

  // ── In-legals subset of the live pipeline ─────────────────────────────
  const { data: legalsStage } = await supabase
    .from("deal_stages")
    .select("id")
    .eq("key", "solicitors_instructed")
    .maybeSingle();
  const { data: liveDeals } = await supabase.from("deals").select("id").eq("status", "in_progress");
  const liveIds = (liveDeals ?? []).map((d) => d.id);
  let inLegals = 0;
  if (legalsStage && liveIds.length) {
    const { data: legalEvents } = await supabase
      .from("deal_stage_events")
      .select("deal_id")
      .eq("stage_id", legalsStage.id)
      .in("deal_id", liveIds);
    inLegals = new Set((legalEvents ?? []).map((e) => e.deal_id)).size;
  }

  // ── Batched counts ────────────────────────────────────────────────────
  const [
    loaIssued,
    loaReceived,
    loaLapsed,
    salesPartsSent,
    toBeLaunched,
    onMarket,
    beingUpdated,
    hdPaid,
    newRegistrations,
    unsubscribed,
    offersTotal,
    offersThisMonth,
    offersConsidering,
    offersAcceptedTotal,
    offersAcceptedMonth,
    completedMonth,
    withdrawnMonth,
  ] = await Promise.all([
    count(() => supabase.from("practices").select("id", { count: "exact", head: true }).gte("loa_issued_at", fromDate).lt("loa_issued_at", toDate)),
    count(() => supabase.from("practices").select("id", { count: "exact", head: true }).gte("loa_received_at", fromDate).lt("loa_received_at", toDate)),
    count(() => supabase.from("practices").select("id", { count: "exact", head: true }).gte("loa_lapsed_at", fromDate).lt("loa_lapsed_at", toDate)),
    count(() => supabase.from("practices").select("id", { count: "exact", head: true }).gte("sales_particulars_sent_at", fromDate).lt("sales_particulars_sent_at", toDate)),
    count(() => supabase.from("practices").select("id", { count: "exact", head: true }).eq("status", "preparing")),
    count(() => supabase.from("practices").select("id", { count: "exact", head: true }).eq("status", "available")),
    count(() => supabase.from("practices").select("id", { count: "exact", head: true }).eq("status", "available").eq("being_updated", true)),
    count(() => supabase.from("practices").select("id", { count: "exact", head: true }).eq("status", "available").eq("hd_paid", true)),
    count(() => supabase.from("contacts").select("id", { count: "exact", head: true }).contains("roles", ["buyer"]).gte("created_at", fromTs).lt("created_at", toTs)),
    count(() => supabase.from("suppressions").select("id", { count: "exact", head: true }).eq("reason", "unsubscribed").gte("created_at", fromTs).lt("created_at", toTs)),
    count(() => supabase.from("offers").select("id", { count: "exact", head: true })),
    count(() => supabase.from("offers").select("id", { count: "exact", head: true }).gte("offer_date", fromDate).lt("offer_date", toDate)),
    count(() => supabase.from("offers").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(() => supabase.from("offers").select("id", { count: "exact", head: true }).eq("status", "accepted")),
    count(() => supabase.from("offers").select("id", { count: "exact", head: true }).gte("accepted_at", fromTs).lt("accepted_at", toTs)),
    count(() => supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", fromDate).lt("completed_at", toDate)),
    count(() => supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "fallen_through").gte("fell_through_at", fromDate).lt("fell_through_at", toDate)),
  ]);

  const sections: FigureSection[] = [
    {
      title: "Pre-market",
      rows: [
        { label: "Valuations in month", value: valuationsInMonth },
        { label: "Desktops", value: desktops },
        { label: "Updates", value: updates },
        { label: "LoA's Issued", value: loaIssued },
        { label: "LoA's Received", value: loaReceived },
        { label: "LoA's Lapsed", value: loaLapsed },
        { label: "Sales Parts Sent", value: salesPartsSent },
        { label: "To Be Launched", value: toBeLaunched },
      ],
    },
    {
      title: "On the market",
      rows: [
        { label: "Practices on the market", value: onMarket },
        { label: "Practices on the market being updated", value: beingUpdated },
        { label: "Practice on the market HD paid", value: hdPaid },
        { label: "Partner Members", value: tierValue("partner") },
        { label: "Affiliate Members", value: tierValue("affiliate") },
        { label: "Associate Plus Members", value: tierValue("associate_plus") },
        { label: "Associate Members", value: tierValue("associate") },
        { label: "Total Members", value: totalMembers },
        { label: "New Registrations", value: newRegistrations },
        { label: "Unsubscribed", value: unsubscribed },
        { label: "Offers Placed in total", value: offersTotal },
        { label: "Offers Placed this month", value: offersThisMonth },
        { label: "Offers Being Considered in total", value: offersConsidering },
        { label: "Offers Accepted in total", value: offersAcceptedTotal },
        { label: "Offers Accepted this month", value: offersAcceptedMonth },
      ],
    },
    {
      title: "Referrals",
      rows: [
        ...referralCategories.map((t) => {
          const c = refCount.get(t.id) ?? { n: 0, sum: 0 };
          return { label: t.value, value: c.n, money: c.sum || undefined };
        }),
        { label: "Total", value: refTotal, money: refTotalValue || undefined },
      ],
    },
    {
      title: "Sales Progression (Commission)",
      rows: [
        { label: "Practices In Legals", value: inLegals },
        { label: "Pipeline", value: liveIds.length },
        { label: "Offers Accepted this month", value: offersAcceptedMonth },
        { label: "Offers Being Considered", value: offersConsidering },
        { label: "Completed", value: completedMonth },
        { label: "Withdrawn", value: withdrawnMonth },
      ],
    },
    // The Principals Club section is turned off for now — re-enable by counting
    // contacts.principals_club_id against the principals_club_level lookup.
  ];

  return { month, label, sections };
}
