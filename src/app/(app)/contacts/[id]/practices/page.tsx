import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/primitives";
import { LinkedPracticesList, type LinkedPractice } from "./linked-practices-list";

export default async function ContactPracticesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("practice_contacts")
    .select(
      "id, role, is_primary, created_at, practices!practice_contacts_practice_id_fkey(id, ref, display_title, town, status, asking_price)",
    )
    .eq("contact_id", id)
    .order("created_at", { ascending: false });

  if (!links || links.length === 0) {
    return (
      <EmptyState
        title="Not linked to any practices"
        body="Link this contact from a practice's People tab — as a seller, buyer or professional."
      />
    );
  }

  return <LinkedPracticesList links={links as unknown as LinkedPractice[]} />;
}
