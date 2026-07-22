import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";

/** Everything My Day widgets need, fetched in one parallel pass. */
export type DashboardData = {
  stats: {
    openTasks: number;
    overdueTasks: number;
    myLiveDeals: number;
    myPipelineValue: number;
    availablePractices: number;
    buyerPool: number;
    valuationsThisWeek: number;
    completionsThisMonth: number;
  };
  todayEvents: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    allDay: boolean;
    color: string;
    location: string | null;
    practiceId: string | null;
  }[];
  tasks: {
    overdue: DashTask[];
    today: DashTask[];
    upcoming: DashTask[];
    doneCount: number;
  };
  attention: { label: string; sublabel: string; href: string; tone: "danger" | "warn" | "gold" }[];
  activity: {
    id: string;
    author: string;
    color: string | null;
    type: string;
    label: string | null;
    href: string;
    body: string | null;
    occurredAt: string;
  }[];
  pipeline: {
    id: string;
    title: string;
    ref: string;
    agreedPrice: number | null;
    stageLabel: string | null;
    stageIndex: number;
    totalStages: number;
    lastActivityAt: string;
  }[];
};

type DashTask = {
  id: string;
  title: string;
  dueAt: string | null;
  href: string | null;
  linked: string | null;
};

export async function getDashboardData(profileId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const soon = new Date(now.getTime() + 60 * 86_400_000).toISOString().slice(0, 10);
  const stalledCut = new Date(now.getTime() - 14 * 86_400_000).toISOString();

  const [
    eventsRes,
    tasksRes,
    stalledRes,
    expiringRes,
    feedbackRes,
    activityRes,
    dealsRes,
    availRes,
    buyersRes,
    valWeekRes,
    compMonthRes,
    stageDefsRes,
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(
        "id, title, starts_at, ends_at, all_day, location, organiser_id, practice_id, visibility, lookup_values!calendar_events_event_type_id_fkey(color), calendar_event_attendees(profile_id)",
      )
      .gte("starts_at", startOfDay.toISOString())
      .lte("starts_at", endOfDay.toISOString())
      .neq("status", "cancelled")
      .order("starts_at")
      .limit(40),
    supabase
      .from("tasks")
      .select(
        "id, title, due_at, status, contact_id, practice_id, deal_id, contacts!tasks_contact_id_fkey(first_name, last_name, company_name), practices!tasks_practice_id_fkey(display_title)",
      )
      .eq("assignee_id", profileId)
      .neq("status", "cancelled")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(200),
    supabase
      .from("deals")
      .select("id, ref, last_activity_at, practices!deals_practice_id_fkey(display_title)")
      .eq("status", "in_progress")
      .lt("last_activity_at", stalledCut)
      .order("last_activity_at")
      .limit(6),
    supabase
      .from("practices")
      .select("id, display_title, contract_expiry")
      .in("status", ["available", "under_offer", "sold_stc"])
      .not("contract_expiry", "is", null)
      .lte("contract_expiry", soon)
      .order("contract_expiry")
      .limit(6),
    supabase
      .from("viewings")
      .select("id, practice_id, practices!viewings_practice_id_fkey(display_title)")
      .eq("status", "completed")
      .is("feedback", null)
      .limit(6),
    supabase
      .from("journal_entries")
      .select(
        "id, entry_type, subject, body, occurred_at, contact_id, practice_id, deal_id, profiles!journal_entries_author_id_fkey(full_name, calendar_color), contacts!journal_entries_contact_id_fkey(first_name, last_name, company_name), practices!journal_entries_practice_id_fkey(display_title)",
      )
      .order("occurred_at", { ascending: false })
      .limit(12),
    supabase
      .from("deals")
      .select(
        "id, ref, agreed_price, current_stage_id, last_activity_at, practices!deals_practice_id_fkey(display_title)",
      )
      .eq("status", "in_progress")
      .order("last_activity_at", { ascending: false })
      .limit(8),
    supabase.from("practices").select("id", { count: "exact", head: true }).eq("status", "available"),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .contains("roles", ["buyer"])
      .is("archived_at", null),
    supabase
      .from("valuations")
      .select("id", { count: "exact", head: true })
      .gte("appointment_at", startOfDay.toISOString())
      .lte("appointment_at", weekAhead.toISOString()),
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", startOfMonth.toISOString().slice(0, 10)),
    supabase.from("deal_stages").select("id, label, sort_order").order("sort_order"),
  ]);

  // Today's events the user is on.
  const todayEvents = (eventsRes.data ?? [])
    .filter(
      (e) =>
        e.organiser_id === profileId ||
        (e.calendar_event_attendees as { profile_id: string | null }[]).some((a) => a.profile_id === profileId),
    )
    .map((e) => ({
      id: e.id,
      title: e.visibility === "private" && e.organiser_id !== profileId ? "Busy" : e.title,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      allDay: e.all_day,
      color: (e.lookup_values as unknown as { color: string | null } | null)?.color ?? "#5E5E5A",
      location: e.location,
      practiceId: e.practice_id,
    }));

  // Tasks bucketed.
  const mapTask = (t: {
    id: string;
    title: string;
    due_at: string | null;
    contact_id: string | null;
    practice_id: string | null;
    deal_id: string | null;
    contacts: unknown;
    practices: unknown;
  }): DashTask => {
    const c = t.contacts as { first_name: string | null; last_name: string | null; company_name: string | null } | null;
    const p = t.practices as { display_title: string } | null;
    return {
      id: t.id,
      title: t.title,
      dueAt: t.due_at,
      linked: (c ? contactName(c) : null) ?? p?.display_title ?? null,
      href: t.contact_id
        ? `/contacts/${t.contact_id}`
        : t.practice_id
          ? `/practices/${t.practice_id}`
          : t.deal_id
            ? `/deals/${t.deal_id}`
            : null,
    };
  };
  const openTasks = (tasksRes.data ?? []).filter((t) => t.status === "open");
  const overdue = openTasks.filter((t) => t.due_at && new Date(t.due_at) < now).map(mapTask);
  const todayTasks = openTasks
    .filter((t) => t.due_at && new Date(t.due_at) >= now && new Date(t.due_at) <= endOfDay)
    .map(mapTask);
  const upcoming = openTasks
    .filter((t) => !t.due_at || new Date(t.due_at) > endOfDay)
    .slice(0, 12)
    .map(mapTask);
  const doneCount = (tasksRes.data ?? []).filter(
    (t) => t.status === "done" && t.due_at && new Date(t.due_at) >= startOfDay,
  ).length;

  // Needs attention.
  const attention: DashboardData["attention"] = [];
  for (const d of stalledRes.data ?? []) {
    const p = d.practices as unknown as { display_title: string } | null;
    attention.push({
      label: p?.display_title ?? d.ref,
      sublabel: "Deal stalled — no activity 14+ days",
      href: `/deals/${d.id}`,
      tone: "danger",
    });
  }
  for (const p of expiringRes.data ?? []) {
    attention.push({
      label: p.display_title,
      sublabel: `Agency contract expires ${p.contract_expiry}`,
      href: `/practices/${p.id}`,
      tone: "warn",
    });
  }
  for (const v of feedbackRes.data ?? []) {
    const p = v.practices as unknown as { display_title: string } | null;
    attention.push({
      label: p?.display_title ?? "Practice",
      sublabel: "Viewing needs feedback",
      href: `/practices/${v.practice_id}`,
      tone: "gold",
    });
  }

  // Activity.
  const activity = (activityRes.data ?? []).map((j) => {
    const author = j.profiles as unknown as { full_name: string; calendar_color: string } | null;
    const c = j.contacts as unknown as { first_name: string | null; last_name: string | null; company_name: string | null } | null;
    const p = j.practices as unknown as { display_title: string } | null;
    return {
      id: j.id,
      author: author?.full_name ?? "System",
      color: author?.calendar_color ?? null,
      type: j.entry_type,
      label: (c ? contactName(c) : null) ?? p?.display_title ?? (j.deal_id ? "Deal" : null),
      href: j.contact_id
        ? `/contacts/${j.contact_id}`
        : j.practice_id
          ? `/practices/${j.practice_id}`
          : j.deal_id
            ? `/deals/${j.deal_id}`
            : "#",
      body: j.subject ?? j.body,
      occurredAt: j.occurred_at,
    };
  });

  // Pipeline (in-progress deals) with stage position.
  const stageDefs = stageDefsRes.data ?? [];
  const stageIndexById = new Map(stageDefs.map((s, idx) => [s.id, idx]));
  const stageLabelById = new Map(stageDefs.map((s) => [s.id, s.label]));
  const pipeline = (dealsRes.data ?? []).map((d) => {
    const p = d.practices as unknown as { display_title: string } | null;
    return {
      id: d.id,
      title: p?.display_title ?? d.ref,
      ref: d.ref,
      agreedPrice: d.agreed_price,
      stageLabel: d.current_stage_id ? (stageLabelById.get(d.current_stage_id) ?? null) : "Completion",
      stageIndex: d.current_stage_id ? (stageIndexById.get(d.current_stage_id) ?? stageDefs.length) : stageDefs.length,
      totalStages: stageDefs.length,
      lastActivityAt: d.last_activity_at,
    };
  });

  const myPipelineValue = pipeline.reduce((s, d) => s + Number(d.agreedPrice ?? 0), 0);

  return {
    stats: {
      openTasks: openTasks.length,
      overdueTasks: overdue.length,
      myLiveDeals: pipeline.length,
      myPipelineValue,
      availablePractices: availRes.count ?? 0,
      buyerPool: buyersRes.count ?? 0,
      valuationsThisWeek: valWeekRes.count ?? 0,
      completionsThisMonth: compMonthRes.count ?? 0,
    },
    todayEvents,
    tasks: { overdue, today: todayTasks, upcoming, doneCount },
    attention,
    activity,
    pipeline,
  };
}
