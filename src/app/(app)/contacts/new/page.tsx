import { getLookup } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { ContactForm } from "../contact-form";

export const metadata = { title: "New contact" };

export default async function NewContactPage() {
  const sources = await getLookup("contact_source");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New contact" />
      <ContactForm sources={sources} />
    </div>
  );
}
