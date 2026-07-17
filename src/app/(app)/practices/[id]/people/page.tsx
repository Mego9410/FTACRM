import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";
import { PeopleClient } from "./people-client";

export default async function PracticePeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("practice_contacts")
    .select(
      "id, role, is_primary, notes, created_at, contacts!practice_contacts_contact_id_fkey(id, first_name, last_name, company_name, email, phone, mobile)",
    )
    .eq("practice_id", id)
    .order("created_at");

  const people = (links ?? [])
    .map((l) => {
      const c = l.contacts as unknown as {
        id: string;
        first_name: string | null;
        last_name: string | null;
        company_name: string | null;
        email: string | null;
        phone: string | null;
        mobile: string | null;
      } | null;
      if (!c) return null;
      return {
        linkId: l.id,
        role: l.role,
        is_primary: l.is_primary,
        notes: l.notes,
        contactId: c.id,
        name: contactName(c),
        email: c.email,
        phone: c.mobile ?? c.phone,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return <PeopleClient practiceId={id} people={people} />;
}
