import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLookup } from "@/lib/lookups";
import { BuyerProfileClient } from "./buyer-profile-client";

export default async function BuyerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: contact }, { data: criteria }, { data: areas }, specialisms, structures, fundings, tenures, positions] =
    await Promise.all([
      supabase.from("contacts").select("id, roles").eq("id", id).maybeSingle(),
      supabase.from("buyer_criteria").select("*").eq("contact_id", id).maybeSingle(),
      supabase.from("buyer_search_areas").select("id, label, region, radius_miles").eq("contact_id", id).order("created_at"),
      getLookup("specialism"),
      getLookup("deal_structure"),
      getLookup("funding_type"),
      getLookup("tenure_type"),
      getLookup("buyer_position"),
    ]);
  if (!contact || !(contact.roles as string[]).includes("buyer")) notFound();

  return (
    <BuyerProfileClient
      contactId={id}
      criteria={criteria}
      areas={areas ?? []}
      lookups={{ specialisms, structures, fundings, tenures, positions }}
    />
  );
}
