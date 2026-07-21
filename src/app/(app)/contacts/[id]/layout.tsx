import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";
import { LinkTabs } from "@/components/ui/tabs";
import { ContactHeader } from "./contact-header";

export default async function ContactLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select(
      "id, ref, kind, first_name, last_name, company_name, email, phone, mobile, roles, status, temperature, owner_id, branch_id, do_not_contact, consent_email, consent_updated_at, identity_verified, address_verified, last_contacted_at, archived_at, organisation_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!contact) notFound();

  // Fetched separately and tolerantly so an un-migrated `warning` column can't
  // break the record page.
  const { data: warnRow } = await supabase.from("contacts").select("warning").eq("id", id).maybeSingle();
  const warning = (warnRow as { warning: string | null } | null)?.warning ?? null;

  const isBuyer = (contact.roles as string[]).includes("buyer");
  const base = `/contacts/${id}`;
  const tabs = [
    { label: "Details", href: base, exact: true },
    ...(isBuyer ? [{ label: "Buyer profile", href: `${base}/buyer` }] : []),
    { label: "Practices", href: `${base}/practices` },
    { label: "Tasks", href: `${base}/tasks` },
    { label: "Journal", href: `${base}/journal` },
    { label: "Documents", href: `${base}/documents` },
    { label: "Checklists", href: `${base}/checklist` },
    { label: "Related", href: `${base}/related` },
    { label: "Audit", href: `${base}/audit` },
  ];

  return (
    <div>
      <ContactHeader contact={{ ...contact, name: contactName(contact), warning }} />
      <LinkTabs tabs={tabs} className="mb-5" />
      {children}
    </div>
  );
}
