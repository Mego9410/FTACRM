import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Every 15 min: notify assignees of open tasks whose reminder has fallen due. */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const admin = createAdminClient();

  const { data: due } = await admin
    .from("tasks")
    .select("id, title, due_at, assignee_id")
    .eq("status", "open")
    .not("assignee_id", "is", null)
    .not("reminder_at", "is", null)
    .is("reminded_at", null)
    .lte("reminder_at", new Date().toISOString())
    .limit(200);

  let reminded = 0;
  for (const task of due ?? []) {
    if (!task.assignee_id) continue;
    const body = task.due_at
      ? `${task.title} · due ${new Date(task.due_at).toLocaleString("en-GB")}`
      : task.title;
    await admin.from("notifications").insert({
      profile_id: task.assignee_id,
      kind: "task_reminder",
      title: "Task reminder",
      body,
      link_url: `/tasks?task=${task.id}`,
    });
    await admin
      .from("tasks")
      .update({ reminded_at: new Date().toISOString() })
      .eq("id", task.id);
    reminded += 1;
  }

  return NextResponse.json({ due: due?.length ?? 0, reminded });
}
