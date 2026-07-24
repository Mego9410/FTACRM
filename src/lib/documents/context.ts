import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_MERGE_FIELDS } from "@/lib/documents/merge-fields";

export type ResolvedField = { key: string; label: string; value: string };
export type DocContext = { fields: ResolvedField[]; signerName: string; signerEmail: string };

/** Today formatted "23 July 2026" (Europe/London-safe long date). */
export function longDate(d = new Date()): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
}

/**
 * Resolve the document merge fields for a practice: auto values from the
 * practice + its primary seller + the current user (agent), with sensible
 * defaults for the fields staff confirm at generation. Returns the editable
 * field list plus default signer details (the primary seller).
 */
export async function buildPracticeDocContext(practiceId: string): Promise<DocContext> {
  const me = await requireProfile();
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("practices")
    .select("name, display_title, address_line1, address_line2, town, county, postcode, fee_percent")
    .eq("id", practiceId)
    .maybeSingle();

  const { data: sellerLink } = await supabase
    .from("practice_contacts")
    .select("is_primary, contacts!practice_contacts_contact_id_fkey(title, first_name, last_name, company_name, email)")
    .eq("practice_id", practiceId)
    .eq("role", "seller")
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();
  const seller = (sellerLink?.contacts ?? null) as
    | { title: string | null; first_name: string | null; last_name: string | null; company_name: string | null; email: string | null }
    | null;

  const sellerName =
    [seller?.title, seller?.first_name, seller?.last_name].filter(Boolean).join(" ") || seller?.company_name || "";
  const address = [p?.address_line1, p?.address_line2, p?.town, p?.county, p?.postcode].filter(Boolean).join("\n");

  const values: Record<string, string> = {
    "date.today": longDate(),
    "agent.name": (me.full_name ?? "").split(" ")[0] ?? "",
    "practice.name": p?.name ?? p?.display_title ?? "",
    "practice.legal_name": p?.name ?? "",
    "practice.address": address,
    "practice.town": p?.town ?? "",
    "practice.postcode": p?.postcode ?? "",
    "fee.percent": p?.fee_percent != null ? String(p.fee_percent) : "",
    "fee.minimum": "£12,000",
    "seller.name": sellerName,
    "seller.title": seller?.title ?? "",
  };

  const fields = DOCUMENT_MERGE_FIELDS.filter((f) => f.key !== "signature").map((f) => ({
    key: f.key,
    label: f.label,
    value: values[f.key] ?? "",
  }));

  return { fields, signerName: sellerName, signerEmail: seller?.email ?? "" };
}
