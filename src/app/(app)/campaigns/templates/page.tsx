import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { TemplatesClient } from "./templates-client";

export const metadata = { title: "Email templates" };

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("email_templates")
    .select("id, name, subject, body_html, record_context, is_active")
    .eq("scope", "campaign")
    .order("name");

  return (
    <div>
      <PageHeader eyebrow="Communications" title="Campaigns" subtitle="Reusable campaign templates with merge tags" />
      <LinkTabs
        className="mb-4"
        tabs={[
          { label: "Campaigns", href: "/campaigns", exact: true },
          { label: "Templates", href: "/campaigns/templates" },
          { label: "Suppressions", href: "/campaigns/suppressions" },
        ]}
      />
      <TemplatesClient templates={templates ?? []} />
    </div>
  );
}
