import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { TASK_LINKS_SELECT, buildTaskLinks } from "@/app/(app)/tasks/task-links";
import type { RecordTaskRow } from "./record-tasks";

/** Load every task linked to a record (via task_links) + the composer's team/categories. */
export async function loadRecordTasks(column: "contact_id" | "practice_id" | "deal_id", id: string) {
  const me = await requireProfile();
  const supabase = await createClient();

  const [{ data: linkRows }, { data: team }, categories] = await Promise.all([
    supabase.from("task_links").select("task_id").eq(column, id).limit(500),
    supabase.from("profiles").select("id, full_name, calendar_color").eq("is_active", true).order("full_name"),
    getLookup("task_category"),
  ]);

  const ids = [...new Set((linkRows ?? []).map((r) => r.task_id))];
  let tasks: unknown[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("tasks")
      .select(
        `id, title, details, due_at, status, task_type, priority, reminder_at, assignee_id, category_id, assignee:profiles!tasks_assignee_id_fkey(full_name, calendar_color), ${TASK_LINKS_SELECT}`,
      )
      .in("id", ids)
      .neq("status", "cancelled")
      .order("status")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(300);
    tasks = data ?? [];
  }

  const rows: RecordTaskRow[] = (tasks as Record<string, unknown>[]).map((t) => {
    const a = t.assignee as { full_name: string; calendar_color: string | null } | null;
    return {
      id: t.id as string,
      title: t.title as string,
      details: (t.details as string | null) ?? null,
      due_at: (t.due_at as string | null) ?? null,
      status: t.status as string,
      task_type: (t.task_type as string) ?? "todo",
      priority: (t.priority as string | null) ?? null,
      reminder_at: (t.reminder_at as string | null) ?? null,
      assignee_id: (t.assignee_id as string | null) ?? null,
      category_id: (t.category_id as string | null) ?? null,
      links: buildTaskLinks(t.task_links),
      assigneeName: a?.full_name ?? null,
      assigneeColor: a?.calendar_color ?? null,
    };
  });

  return { me: me.id, team: team ?? [], categories, rows };
}
