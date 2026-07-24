import { getLookup } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { ContactForm } from "../contact-form";

export const metadata = { title: "New contact" };

export default async function NewContactPage() {
  const [sources, membershipTiers, principalsClubLevels] = await Promise.all([
    getLookup("contact_source"),
    getLookup("membership_tier"),
    getLookup("principals_club_level"),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New contact" />
      <ContactForm sources={sources} membershipTiers={membershipTiers} principalsClubLevels={principalsClubLevels} />
    </div>
  );
}
