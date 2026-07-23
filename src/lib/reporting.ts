import { createClient } from "@/lib/supabase/server";

export type Period = { from: Date; to: Date };

export type KpiSet = {
  instructions: number;
  instructionsValue: number;
  valuationsBooked: number;
  valuationsInstructed: number;
  completions: number;
  completionsValue: number;
  completionsFees: number;
  offersReceived: number;
  fallThroughs: number;
  newBuyers: number;
  avgSalePrice: number | null;
  medianDaysToComplete: number | null;
};

export type PipelineSnapshot = {
  liveDeals: number;
  liveDealsValue: number;
  pipelineFees: number;
  availablePractices: number;
  activeBuyers: number;
};

function overlaps(fromCol: string, period: Period) {
  return { gte: period.from.toISOString(), lte: period.to.toISOString() };
}

export async function computeKpis(period: Period): Promise<KpiSet> {
  const supabase = await createClient();
  const range = overlaps("", period);
  const dateOnly = { gte: range.gte.slice(0, 10), lte: range.lte.slice(0, 10) };

  const instructionsQ = supabase
    .from("practices")
    .select("asking_price")
    .gte("instructed_at", dateOnly.gte)
    .lte("instructed_at", dateOnly.lte);

  const completionsQ = supabase
    .from("deals")
    .select("agreed_price, completed_at, created_at, practices!deals_practice_id_fkey(fee_percent, fee_fixed)")
    .eq("status", "completed")
    .gte("completed_at", dateOnly.gte)
    .lte("completed_at", dateOnly.lte);

  const [instructionsRes, valuationsRes, completionsRes, offersRes, fellRes, buyersRes] = await Promise.all([
    instructionsQ,
    supabase
      .from("valuations")
      .select("id, outcome, appointment_at")
      .gte("appointment_at", range.gte)
      .lte("appointment_at", range.lte),
    completionsQ,
    supabase.from("offers").select("id").gte("created_at", range.gte).lte("created_at", range.lte),
    supabase
      .from("deals")
      .select("id")
      .eq("status", "fallen_through")
      .gte("fell_through_at", dateOnly.gte)
      .lte("fell_through_at", dateOnly.lte),
    supabase
      .from("contacts")
      .select("id")
      .contains("roles", ["buyer"])
      .gte("created_at", range.gte)
      .lte("created_at", range.lte),
  ]);

  const completions = completionsRes.data ?? [];
  const completionsValue = completions.reduce((sum, d) => sum + Number(d.agreed_price ?? 0), 0);
  const completionsFees = completions.reduce((sum, d) => {
    const practice = d.practices as unknown as { fee_percent: number | null; fee_fixed: number | null } | null;
    const price = Number(d.agreed_price ?? 0);
    if (practice?.fee_percent) return sum + (price * Number(practice.fee_percent)) / 100;
    if (practice?.fee_fixed) return sum + Number(practice.fee_fixed);
    return sum;
  }, 0);
  const daysToComplete = completions
    .filter((d) => d.completed_at && d.created_at)
    .map((d) => Math.round((new Date(d.completed_at!).getTime() - new Date(d.created_at).getTime()) / 86_400_000))
    .sort((a, b) => a - b);

  return {
    instructions: instructionsRes.data?.length ?? 0,
    instructionsValue: (instructionsRes.data ?? []).reduce((s, p) => s + Number(p.asking_price ?? 0), 0),
    valuationsBooked: valuationsRes.data?.length ?? 0,
    valuationsInstructed: (valuationsRes.data ?? []).filter((v) => v.outcome === "instructed").length,
    completions: completions.length,
    completionsValue,
    completionsFees,
    offersReceived: offersRes.data?.length ?? 0,
    fallThroughs: fellRes.data?.length ?? 0,
    newBuyers: buyersRes.data?.length ?? 0,
    avgSalePrice: completions.length > 0 ? completionsValue / completions.length : null,
    medianDaysToComplete:
      daysToComplete.length > 0 ? daysToComplete[Math.floor(daysToComplete.length / 2)]! : null,
  };
}

export async function computePipeline(): Promise<PipelineSnapshot> {
  const supabase = await createClient();
  const dealsQ = supabase
    .from("deals")
    .select("agreed_price, practices!deals_practice_id_fkey(fee_percent, fee_fixed)")
    .eq("status", "in_progress");

  const [dealsRes, availableRes, buyersRes] = await Promise.all([
    dealsQ,
    supabase.from("practices").select("id", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("contacts").select("id", { count: "exact", head: true }).contains("roles", ["buyer"]).is("archived_at", null),
  ]);

  const deals = dealsRes.data ?? [];
  return {
    liveDeals: deals.length,
    liveDealsValue: deals.reduce((s, d) => s + Number(d.agreed_price ?? 0), 0),
    pipelineFees: deals.reduce((s, d) => {
      const p = d.practices as unknown as { fee_percent: number | null; fee_fixed: number | null } | null;
      const price = Number(d.agreed_price ?? 0);
      if (p?.fee_percent) return s + (price * Number(p.fee_percent)) / 100;
      if (p?.fee_fixed) return s + Number(p.fee_fixed);
      return s;
    }, 0),
    availablePractices: availableRes.count ?? 0,
    activeBuyers: buyersRes.count ?? 0,
  };
}

/** Completions per month for the trailing 12 months (chart data). */
export async function completionsByMonth(): Promise<{ month: string; completions: number; value: number }[]> {
  const supabase = await createClient();
  const from = new Date();
  from.setMonth(from.getMonth() - 11);
  from.setDate(1);
  const { data } = await supabase
    .from("deals")
    .select("completed_at, agreed_price")
    .eq("status", "completed")
    .gte("completed_at", from.toISOString().slice(0, 10));

  const buckets = new Map<string, { completions: number; value: number }>();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, { completions: 0, value: 0 });
  }
  for (const row of data ?? []) {
    if (!row.completed_at) continue;
    const key = row.completed_at.slice(0, 7);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.completions += 1;
      bucket.value += Number(row.agreed_price ?? 0);
    }
  }
  return [...buckets.entries()].map(([month, v]) => ({
    month: new Date(`${month}-01`).toLocaleDateString("en-GB", { month: "short" }),
    ...v,
  }));
}

export type SmartList = { name: string; count: number; href: string; hint: string };

export async function computeSmartLists(): Promise<SmartList[]> {
  const supabase = await createClient();
  const soon = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
  const stale90 = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const stale30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const stalled = new Date(Date.now() - 14 * 86_400_000).toISOString();

  const [contracts, staleBuyers, valuationsPending, offersPending, stalledDeals, feedback, introEmails] = await Promise.all([
    supabase
      .from("practices")
      .select("id", { count: "exact", head: true })
      .in("status", ["available", "under_offer", "sold_stc"])
      .not("contract_expiry", "is", null)
      .lte("contract_expiry", soon),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .contains("roles", ["buyer"])
      .is("archived_at", null)
      .or(`last_contacted_at.is.null,last_contacted_at.lt.${stale90}`),
    supabase
      .from("valuations")
      .select("id", { count: "exact", head: true })
      .or("outcome.is.null,outcome.eq.pending")
      .lt("appointment_at", new Date().toISOString()),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress")
      .lt("last_activity_at", stalled),
    supabase
      .from("viewings")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .is("feedback", null),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .eq("title", "Send introduction email"),
  ]);

  return [
    {
      name: "Agency contracts expiring",
      count: contracts.count ?? 0,
      href: "/practices?status=live",
      hint: "Live listings whose agency agreement ends within 60 days",
    },
    {
      name: "Buyers not contacted 90 days",
      count: staleBuyers.count ?? 0,
      href: "/contacts?role=buyer&stale=90",
      hint: "Active buyers going cold",
    },
    {
      name: "Valuations awaiting outcome",
      count: valuationsPending.count ?? 0,
      href: "/practices?status=valuation",
      hint: "Appointments that happened but have no recorded outcome",
    },
    {
      name: "Pending offers",
      count: offersPending.count ?? 0,
      href: "/practices?status=live",
      hint: "Offers waiting for a decision",
    },
    {
      name: "Stalled deals",
      count: stalledDeals.count ?? 0,
      href: "/deals?stalled=1",
      hint: "In-progress deals silent for 14+ days",
    },
    {
      name: "Viewings needing feedback",
      count: feedback.count ?? 0,
      href: "/practices?status=live",
      hint: "Completed viewings with no feedback recorded",
    },
    {
      name: "Introduction emails to send",
      count: introEmails.count ?? 0,
      href: "/tasks?view=all",
      hint: "Buyers with an open post-call introduction email reminder",
    },
  ];
}
