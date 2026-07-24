import { createClient } from "@/lib/supabase/server";
import { buildPracticeDocContext } from "@/lib/documents/context";
import { listSignatureRequests } from "@/lib/documents/signatures";
import { Documents } from "@/components/record/documents";
import { RecordDocuments } from "@/components/record/record-documents";

export default async function PracticeDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = `/practices/${id}/documents`;
  const supabase = await createClient();
  const [{ data: templates }, ctx, requests] = await Promise.all([
    supabase.from("document_templates").select("id, name, body_html").eq("is_active", true).order("sort_order"),
    buildPracticeDocContext(id),
    listSignatureRequests({ practiceId: id }),
  ]);

  return (
    <div className="space-y-5">
      <RecordDocuments
        templates={templates ?? []}
        fields={ctx.fields}
        signerName={ctx.signerName}
        signerEmail={ctx.signerEmail}
        requests={requests}
        practiceId={id}
        path={path}
      />
      <Documents link={{ practiceId: id }} path={path} />
    </div>
  );
}
