import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { emailSendingEnabled } from "@/lib/email/provider";
import { CampaignComposer } from "../campaign-composer";

export const metadata = { title: "New campaign" };

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ contacts?: string; practice?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const [fundings, tenures, specialisms, { data: owners }, { data: templates }] =
    await Promise.all([
      getLookup("funding_type"),
      getLookup("tenure_type"),
      getLookup("specialism"),
      supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
      supabase
        .from("email_templates")
        .select("id, name, subject, body_html, record_context")
        .eq("is_active", true)
        .eq("scope", "campaign")
        .order("name"),
    ]);

  const explicitIds = params.contacts?.split(",").filter(Boolean) ?? [];
  let practice: { id: string; display_title: string } | null = null;
  if (params.practice) {
    const { data } = await supabase
      .from("practices")
      .select("id, display_title")
      .eq("id", params.practice)
      .maybeSingle();
    practice = data;
  }

  return (
    <div>
      <PageHeader
        title="New campaign"
        subtitle={
          practice
            ? `Pre-linked to ${practice.display_title} — practice merge tags available`
            : "Pick the audience, write the email, preview with real data"
        }
      />
      <CampaignComposer
        lookups={{ fundings, tenures, specialisms }}
        owners={owners ?? []}
        templates={templates ?? []}
        explicitContactIds={explicitIds}
        practice={practice}
        sendingEnabled={emailSendingEnabled()}
      />
    </div>
  );
}
