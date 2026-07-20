import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { TasksClient, type TaskRow } from "./tasks-client";
import type { LinkType } from "./link-search";

export const metadata = { title: "Tasks" };

type Search = { view?: string; new?: string };

function contactType(roles: string[]): LinkType {
  if (roles.includes("seller")) return "seller";
  if (roles.includes("solicitor")) return "solicitor";
  return "buyer";
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await requireProfile();
  const params = await searchParams;
  const supabase = await createClient();
  const view = params.view ?? "mine";

  let query = supabase
    .from("tasks")
    .select(
      "id, title, details, due_at, status, assignee_id, created_by, category_id, contact_id, practice_id, deal_id, completed_at, contacts!tasks_contact_id_fkey(first_name, last_name, company_name, roles), practices!tasks_practice_id_fkey(display_title), deals!tasks_deal_id_fkey(ref), assignee:profiles!tasks_assignee_id_fkey(full_name, calendar_color), creator:profiles!tasks_created_by_fkey(full_name)",
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
    const contact = t.contacts as unknown as {
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
      roles: string[] | null;
    } | null;
    const practice = t.practices as unknown as { display_title: string } | null;
    const deal = t.deals as unknown as { ref: string } | null;
    const assignee = t.assignee as unknown as { full_name: string; calendar_color: string | null } | null;
    const creator = t.creator as unknown as { full_name: string } | null;

    let link: TaskRow["link"] = null;
    if (t.practice_id && practice) {
      link = { type: "practice", column: "practice_id", id: t.practice_id, title: practice.display_title, href: `/practices/${t.practice_id}` };
    } else if (t.contact_id && contact) {
      const type = contactType(contact.roles ?? []);
      link = {
        type,
        column: "contact_id",
        id: t.contact_id,
        title: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company_name || "Contact",
        href: `/contacts/${t.contact_id}`,
      };
    } else if (t.deal_id && deal) {
      link = { type: "deal", column: "deal_id", id: t.deal_id, title: deal.ref, href: `/deals/${t.deal_id}` };
    }

    return {
      id: t.id,
      title: t.title,
      details: t.details,
      due_at: t.due_at,
      status: t.status,
      assignee_id: t.assignee_id,
      created_by: t.created_by,
      category_id: t.category_id,
      link,
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
        tasks={rows}
        team={team ?? []}
        categories={categories}
      />
    </div>
  );
}
