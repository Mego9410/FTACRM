import { createClient } from "@/lib/supabase/server";
import { DocumentTemplatesClient } from "./documents-templates-client";

export const metadata = { title: "Documents" };

export default async function AdminDocumentsPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("document_templates")
    .select("id, name, description, body_html, is_active, key")
    .order("sort_order");

  return <DocumentTemplatesClient templates={templates ?? []} />;
}
