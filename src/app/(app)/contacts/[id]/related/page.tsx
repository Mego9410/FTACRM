import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";
import { RelatedClient } from "./related-client";

export default async function RelatedContactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from("contact_links")
      .select("id, relationship, contacts!contact_links_related_contact_id_fkey(id, first_name, last_name, company_name, email)")
      .eq("contact_id", id),
    supabase
      .from("contact_links")
      .select("id, relationship, contacts!contact_links_contact_id_fkey(id, first_name, last_name, company_name, email)")
      .eq("related_contact_id", id),
  ]);

  const mapRow = (row: { id: string; relationship: string; contacts: unknown }, direction: "out" | "in") => {
    const c = row.contacts as { id: string; first_name: string | null; last_name: string | null; company_name: string | null; email: string | null } | null;
    return c
      ? {
          linkId: row.id,
          relationship: row.relationship,
          direction,
          contactId: c.id,
          name: contactName(c),
          email: c.email,
        }
      : null;
  };

  const links = [
    ...(outgoing ?? []).map((r) => mapRow(r, "out")),
    ...(incoming ?? []).map((r) => mapRow(r, "in")),
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return <RelatedClient contactId={id} links={links} />;
}
