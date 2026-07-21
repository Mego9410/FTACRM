import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import type { RecordTaskRow } from "./record-tasks";

/** Load a record's tasks + the team/categories the composer needs. */
export async function loadRecordTasks(column: "contact_id" | "practice_id" | "deal_id", id: string) {
  const me = await requireProfile();
  const supabase = await createClient();
  const [{ data: tasks }, { data: team }, categories] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, details, due_at, status, task_type, priority, reminder_at, assignee_id, category_id, assignee:profiles!tasks_assignee_id_fkey(full_name, calendar_color)",
      )
      .eq(column, id)
      .neq("status", "cancelled")
      .order("status")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(200),
    supabase.from("profiles").select("id, full_name, calendar_color").eq("is_active", true).order("full_name"),
    getLookup("task_category"),
  ]);

  const rows: RecordTaskRow[] = (tasks ?? []).map((t) => {
    const a = t.assignee as unknown as { full_name: string; calendar_color: string | null } | null;
    return {
      id: t.id,
      title: t.title,
      details: t.details,
      due_at: t.due_at,
      status: t.status,
      task_type: t.task_type ?? "todo",
      priority: t.priority ?? null,
      reminder_at: t.reminder_at ?? null,
      assignee_id: t.assignee_id,
      category_id: t.category_id,
      assigneeName: a?.full_name ?? null,
      assigneeColor: a?.calendar_color ?? null,
    };
  });

  return { me: me.id, team: team ?? [], categories, rows };
}
