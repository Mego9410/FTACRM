import { createClient } from "@/lib/supabase/server";

export type SidebarData = {
  tasks: { id: string; title: string; dueAt: string | null; href: string }[];
  /** Days of the reference month that have an event the user is on. */
  eventDays: number[];
  year: number;
  /** 0-indexed month. */
  month: number;
  today: number;
};

/** Compact task + calendar data for the expanded left sidebar. */
export async function getSidebarData(profileId: string): Promise<SidebarData> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [tasksRes, eventsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_at, contact_id, practice_id, deal_id")
      .eq("assignee_id", profileId)
      .eq("status", "open")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("calendar_events")
      .select("starts_at, organiser_id, calendar_event_attendees(profile_id)")
      .gte("starts_at", monthStart.toISOString())
      .lte("starts_at", monthEnd.toISOString())
      .neq("status", "cancelled")
      .limit(500),
  ]);

  const tasks = (tasksRes.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    dueAt: t.due_at,
    href: t.contact_id
      ? `/contacts/${t.contact_id}`
      : t.practice_id
        ? `/practices/${t.practice_id}`
        : t.deal_id
          ? `/deals/${t.deal_id}`
          : "/tasks",
  }));

  const days = new Set<number>();
  for (const e of eventsRes.data ?? []) {
    const attendees = (e.calendar_event_attendees as { profile_id: string | null }[]) ?? [];
    const onIt = e.organiser_id === profileId || attendees.some((a) => a.profile_id === profileId);
    if (onIt) days.add(new Date(e.starts_at).getDate());
  }

  return {
    tasks,
    eventDays: [...days],
    year: now.getFullYear(),
    month: now.getMonth(),
    today: now.getDate(),
  };
}
