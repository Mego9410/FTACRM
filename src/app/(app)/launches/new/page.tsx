import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMatchingBuyers } from "@/lib/matching/queries";
import { loadLaunchPractice } from "@/lib/email/launch-data";
import { renderLaunchEmail } from "@/lib/email/launch-template";
import { emailSendingEnabled } from "@/lib/email/provider";
import { PageHeader } from "@/components/shell/page-header";
import { LaunchBuilder } from "./launch-builder";

export const metadata = { title: "New launch" };

export default async function NewLaunchPage({
  searchParams,
}: {
  searchParams: Promise<{ practice?: string }>;
}) {
  const params = await searchParams;
  if (!params.practice) redirect("/launches");

  const [practice, buyers, { data: suppressions }] = await Promise.all([
    loadLaunchPractice(params.practice),
    getMatchingBuyers(params.practice),
    createAdminClient().from("suppressions").select("email"),
  ]);
  if (!practice) notFound();

  const suppressed = new Set((suppressions ?? []).map((s) => String(s.email).toLowerCase()));
  const preview = renderLaunchEmail(practice);

  return (
    <div>
      <PageHeader
        eyebrow="Launches"
        title={`Launch — ${practice.display_title}`}
        subtitle="Details pulled from the practice record; matched buyers pre-selected by the matching engine"
      />
      <LaunchBuilder
        practiceId={params.practice}
        practiceRef={practice.ref}
        preview={preview}
        sendingEnabled={emailSendingEnabled()}
        buyers={buyers.map((b) => ({
          contact_id: b.contact_id,
          name: b.name,
          email: b.email,
          temperature: b.temperature,
          score: b.score,
          facets: b.facets,
          excluded: b.excluded,
          do_not_contact: b.do_not_contact,
          consent_email: b.consent_email,
          suppressed: b.email ? suppressed.has(b.email.toLowerCase()) : false,
        }))}
      />
    </div>
  );
}
