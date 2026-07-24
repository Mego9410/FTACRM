import { createClient } from "@/lib/supabase/server";
import { buildContactDocContext } from "@/lib/documents/context";
import { listSignatureRequests } from "@/lib/documents/signatures";
import { Documents } from "@/components/record/documents";
import { RecordDocuments } from "@/components/record/record-documents";

export default async function ContactDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = `/contacts/${id}/documents`;
  const supabase = await createClient();
  const [{ data: templates }, ctx, requests] = await Promise.all([
    supabase.from("document_templates").select("id, name, body_html").eq("is_active", true).order("sort_order"),
    buildContactDocContext(id),
    listSignatureRequests({ contactId: id }),
  ]);

  return (
    <div className="space-y-5">
      <RecordDocuments
        templates={templates ?? []}
        fields={ctx.fields}
        signerName={ctx.signerName}
        signerEmail={ctx.signerEmail}
        requests={requests}
        link={{ contactId: id }}
        path={path}
      />
      <Documents link={{ contactId: id }} path={path} />
    </div>
  );
}
