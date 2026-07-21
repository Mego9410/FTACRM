import { loadRecordTasks } from "@/components/tasks/record-tasks-data";
import { RecordTasks } from "@/components/tasks/record-tasks";

export const metadata = { title: "Tasks" };

export default async function ContactTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { me, team, categories, rows } = await loadRecordTasks("contact_id", id);
  return (
    <RecordTasks
      recordType="contact"
      recordId={id}
      path={`/contacts/${id}/tasks`}
      me={me}
      team={team}
      categories={categories}
      tasks={rows}
    />
  );
}
