import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { ContactForm } from "../contact-form";

export const metadata = { title: "New contact" };

export default async function NewContactPage() {
  const supabase = await createClient();
  const [sources, { data: owners }, { data: branches }] = await Promise.all([
    getLookup("contact_source"),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New contact" />
      <ContactForm sources={sources} owners={owners ?? []} branches={branches ?? []} />
    </div>
  );
}
