import { loadRecordTasks } from "@/components/tasks/record-tasks-data";
import { RecordTasks } from "@/components/tasks/record-tasks";

export const metadata = { title: "Tasks" };

export default async function PracticeTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { me, team, categories, rows } = await loadRecordTasks("practice_id", id);
  return (
    <RecordTasks
      recordType="practice"
      recordId={id}
      path={`/practices/${id}/tasks`}
      me={me}
      team={team}
      categories={categories}
      tasks={rows}
    />
  );
}
