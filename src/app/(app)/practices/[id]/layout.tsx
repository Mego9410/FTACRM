import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLookupIndex } from "@/lib/lookups";
import { contactName } from "@/lib/contact-helpers";
import { LinkTabs } from "@/components/ui/tabs";
import { PracticeHeadline } from "@/components/practices/practice-headline";
import { PracticeHeader } from "./practice-header";

export default async function PracticeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: practice }, lookupIndex, { data: primarySeller }, reasons] = await Promise.all([
    supabase
      .from("practices")
      .select(
        "id, ref, name, display_title, town, county, postcode, status, asking_price, price_prefix, funding_type_id, tenure_type_id, surgeries, annual_turnover, confidential, owner_id, contract_expiry, lat, lng",
      )
      .eq("id", id)
      .maybeSingle(),
    getLookupIndex(),
    supabase
      .from("practice_contacts")
      .select("contact_id, contacts!practice_contacts_contact_id_fkey(first_name, last_name, company_name)")
      .eq("practice_id", id)
      .eq("role", "seller")
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle(),
    (await import("@/lib/lookups")).getLookup("withdrawal_reason"),
  ]);
  if (!practice) notFound();

  // Fetched separately and tolerantly so an un-migrated `warning` column can't
  // break the record page.
  const { data: warnRow } = await supabase.from("practices").select("warning").eq("id", id).maybeSingle();
  const warning = (warnRow as { warning: string | null } | null)?.warning ?? null;

  // Headline image (tolerant of the column being un-migrated). Signed URL is
  // regenerated per load; falls back to the generated map when there's no photo.
  const { data: headlineRow } = await supabase
    .from("practices")
    .select("headline_image_path")
    .eq("id", id)
    .maybeSingle();
  const headlinePath = (headlineRow as { headline_image_path: string | null } | null)?.headline_image_path ?? null;
  let headlineUrl: string | null = null;
  if (headlinePath) {
    const { data: signed } = await createAdminClient()
      .storage.from("documents")
      .createSignedUrl(headlinePath, 60 * 60);
    headlineUrl = signed?.signedUrl ?? null;
  }

  const seller = primarySeller?.contacts as unknown as {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  } | null;

  const base = `/practices/${id}`;
  return (
    <div>
      <PracticeHeadline
        practiceId={practice.id}
        imageUrl={headlineUrl}
        lat={(practice as { lat: number | null }).lat}
        lng={(practice as { lng: number | null }).lng}
      />
      <PracticeHeader
        practice={{
          id: practice.id,
          ref: practice.ref,
          display_title: practice.display_title,
          name: practice.name,
          town: practice.town,
          postcode: practice.postcode,
          status: practice.status,
          asking_price: practice.asking_price,
          price_prefix: practice.price_prefix,
          funding: practice.funding_type_id ? (lookupIndex.get(practice.funding_type_id) ?? null) : null,
          tenure: practice.tenure_type_id ? (lookupIndex.get(practice.tenure_type_id)?.value ?? null) : null,
          surgeries: practice.surgeries,
          confidential: practice.confidential,
          contract_expiry: practice.contract_expiry,
          warning,
          seller: seller
            ? { id: primarySeller!.contact_id, name: contactName(seller) }
            : null,
        }}
        withdrawalReasons={reasons}
      />
      <LinkTabs
        className="mb-5"
        tabs={[
          { label: "Details", href: base, exact: true },
          { label: "People", href: `${base}/people` },
          { label: "Valuations", href: `${base}/valuations` },
          { label: "Viewings", href: `${base}/viewings` },
          { label: "Offers", href: `${base}/offers` },
          { label: "Matched buyers", href: `${base}/matched` },
          { label: "Tasks", href: `${base}/tasks` },
          { label: "Journal", href: `${base}/journal` },
          { label: "Documents", href: `${base}/documents` },
          { label: "Checklists", href: `${base}/checklist` },
          { label: "Audit", href: `${base}/audit` },
        ]}
      />
      {children}
    </div>
  );
}
