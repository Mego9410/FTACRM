import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { TasksClient, type TaskRow } from "./tasks-client";
import { TASK_LINKS_SELECT, buildTaskLinks } from "./task-links";

export const metadata = { title: "Tasks" };

type Search = { view?: string; new?: string; task?: string };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await requireProfile();
  const params = await searchParams;
  const supabase = await createClient();
  const view = params.view ?? "mine";

  let query = supabase
    .from("tasks")
    .select(
      `id, title, details, due_at, start_at, status, stage, queue, recurrence, task_type, priority, reminder_at, assignee_id, created_by, category_id, completed_at, assignee:profiles!tasks_assignee_id_fkey(full_name, calendar_color), creator:profiles!tasks_created_by_fkey(full_name), ${TASK_LINKS_SELECT}`,
    )
    .neq("status", "cancelled");

  if (view === "mine") query = query.eq("assignee_id", me.id);
  else if (view === "by-me") query = query.eq("created_by", me.id).neq("assignee_id", me.id);
  else if (view === "all") {
    /* everyone — no assignee filter */
  } else query = query.eq("assignee_id", view); // a specific person's id

  const [{ data: tasks }, { data: team }, categories] = await Promise.all([
    query.order("status").order("due_at", { ascending: true, nullsFirst: false }).limit(400),
    supabase.from("profiles").select("id, full_name, calendar_color").eq("is_active", true).order("full_name"),
    getLookup("task_category"),
  ]);

  const rows: TaskRow[] = (tasks ?? []).map((t) => {
    const assignee = t.assignee as unknown as { full_name: string; calendar_color: string | null } | null;
    const creator = t.creator as unknown as { full_name: string } | null;
    return {
      id: t.id,
      title: t.title,
      details: t.details,
      due_at: t.due_at,
      start_at: t.start_at ?? null,
      status: t.status,
      stage: t.stage ?? "not_started",
      queue: t.queue ?? null,
      recurrence: t.recurrence ?? null,
      task_type: t.task_type ?? "todo",
      priority: t.priority ?? null,
      reminder_at: t.reminder_at ?? null,
      assignee_id: t.assignee_id,
      created_by: t.created_by,
      category_id: t.category_id,
      links: buildTaskLinks(t.task_links),
      assigneeName: assignee?.full_name ?? null,
      assigneeColor: assignee?.calendar_color ?? null,
      creatorName: creator?.full_name ?? null,
    };
  });

  return (
    <div>
      <PageHeader eyebrow="Follow-ups" title="Tasks" subtitle="Follow-ups, chases and to-dos across the team" />
      <TasksClient
        me={me.id}
        view={view}
        openNew={params.new === "1"}
        openTaskId={params.task ?? null}
        tasks={rows}
        team={team ?? []}
        categories={categories}
      />
    </div>
  );
}
