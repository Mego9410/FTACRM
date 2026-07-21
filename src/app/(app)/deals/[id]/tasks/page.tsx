import { loadRecordTasks } from "@/components/tasks/record-tasks-data";
import { RecordTasks } from "@/components/tasks/record-tasks";

export const metadata = { title: "Tasks" };

export default async function DealTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { me, team, categories, rows } = await loadRecordTasks("deal_id", id);
  return (
    <RecordTasks
      recordType="deal"
      recordId={id}
      path={`/deals/${id}/tasks`}
      me={me}
      team={team}
      categories={categories}
      tasks={rows}
    />
  );
}
