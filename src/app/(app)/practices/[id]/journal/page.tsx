import { createClient } from "@/lib/supabase/server";
import { Journal } from "@/components/record/journal";
import { RecordWarning } from "@/components/record/record-warning";

export default async function PracticeJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("practices").select("warning").eq("id", id).maybeSingle();
  const warning = (data as { warning: string | null } | null)?.warning ?? null;
  return (
    <div className="space-y-4">
      {warning ? <RecordWarning variant="pinned" table="practices" id={id} warning={warning} /> : null}
      <Journal link={{ practiceId: id }} path={`/practices/${id}/journal`} />
    </div>
  );
}
