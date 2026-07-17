import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { DocumentsClient } from "./documents-client";
import type { JournalLink } from "./journal";

export async function Documents({ link, path }: { link: JournalLink; path: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("documents")
    .select("id, file_name, mime_type, size_bytes, category_id, created_at, profiles!documents_uploaded_by_fkey(full_name)")
    .order("created_at", { ascending: false });
  if (link.contactId) query = query.eq("contact_id", link.contactId);
  else if (link.practiceId) query = query.eq("practice_id", link.practiceId);
  else if (link.dealId) query = query.eq("deal_id", link.dealId);

  const [{ data: docs }, categories] = await Promise.all([query, getLookup("document_category")]);

  return (
    <DocumentsClient
      documents={(docs ?? []).map((d) => ({
        id: d.id,
        file_name: d.file_name,
        mime_type: d.mime_type,
        size_bytes: d.size_bytes,
        category_id: d.category_id,
        created_at: d.created_at,
        uploaded_by: (d.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
      }))}
      categories={categories}
      link={{ contact_id: link.contactId ?? null, practice_id: link.practiceId ?? null, deal_id: link.dealId ?? null }}
      path={path}
    />
  );
}
