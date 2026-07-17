import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { TasksClient } from "./tasks-client";

export const metadata = { title: "Tasks" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ assignee?: string; new?: string }>;
}) {
  const me = await requireProfile();
  const params = await searchParams;
  const supabase = await createClient();
  const assignee = params.assignee ?? me.id;

  const [{ data: tasks }, { data: team }, categories] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, details, due_at, status, assignee_id, category_id, contact_id, practice_id, deal_id, completed_at, contacts!tasks_contact_id_fkey(first_name, last_name, company_name), practices!tasks_practice_id_fkey(display_title)",
      )
      .eq("assignee_id", assignee)
      .neq("status", "cancelled")
      .order("status")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(300),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    getLookup("task_category"),
  ]);

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Follow-ups, chases and to-dos" />
      <TasksClient
        me={me.id}
        canSeeTeam={me.role !== "agent"}
        assignee={assignee}
        openNew={params.new === "1"}
        tasks={(tasks ?? []).map((t) => {
          const contact = t.contacts as unknown as { first_name: string | null; last_name: string | null; company_name: string | null } | null;
          const practice = t.practices as unknown as { display_title: string } | null;
          return {
            ...t,
            linked:
              (contact
                ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company_name
                : null) ??
              practice?.display_title ??
              null,
            linkHref: t.contact_id
              ? `/contacts/${t.contact_id}`
              : t.practice_id
                ? `/practices/${t.practice_id}`
                : t.deal_id
                  ? `/deals/${t.deal_id}`
                  : null,
          };
        })}
        team={team ?? []}
        categories={categories}
      />
    </div>
  );
}
