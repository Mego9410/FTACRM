import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { getProfile } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ContactForm, type ContactFormValues } from "../contact-form";
import { ConsentAmlPanel } from "./consent-aml-panel";

export default async function ContactDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const me = await getProfile();
  const [{ data: contact }, sources, { data: owners }, { data: branches }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).maybeSingle(),
    getLookup("contact_source"),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
  ]);
  if (!contact) notFound();
  const canErase = me ? await hasPermission(me, "contacts.erase") : false;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <ContactForm
        initial={contact as unknown as ContactFormValues}
        sources={sources}
        owners={owners ?? []}
        branches={branches ?? []}
      />
      <div>
        <ConsentAmlPanel
          contact={{
            id: contact.id,
            consent_email: contact.consent_email,
            consent_sms: contact.consent_sms,
            consent_phone: contact.consent_phone,
            consent_letter: contact.consent_letter,
            consent_updated_at: contact.consent_updated_at,
            do_not_contact: contact.do_not_contact,
            identity_verified: contact.identity_verified,
            address_verified: contact.address_verified,
          }}
          canErase={canErase}
        />
      </div>
    </div>
  );
}
