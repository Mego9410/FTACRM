import { createClient } from "@/lib/supabase/server";
import { getLookupIndex } from "@/lib/lookups";
import { matchBuyerToPractice, type MatchBuyer, type MatchPractice } from "./index";

export type BuyerMatchRow = {
  contact_id: string;
  name: string;
  email: string | null;
  temperature: string | null;
  last_contacted_at: string | null;
  do_not_contact: boolean;
  consent_email: boolean | null;
  score: number;
  facets: string[];
  excluded: boolean;
};

export type PracticeMatchRow = {
  practice_id: string;
  ref: string;
  display_title: string;
  town: string | null;
  status: string;
  asking_price: number | null;
  funding: { value: string; color: string | null } | null;
  surgeries: number | null;
  score: number;
  facets: string[];
  excluded: boolean;
};

const PRACTICE_FIELDS =
  "id, ref, display_title, town, county, status, asking_price, lat, lng, funding_type_id, tenure_type_id, specialism_ids, surgeries, annual_turnover";

function toMatchPractice(p: Record<string, unknown>): MatchPractice {
  return {
    id: p.id as string,
    asking_price: p.asking_price as number | null,
    lat: p.lat as number | null,
    lng: p.lng as number | null,
    county: p.county as string | null,
    town: p.town as string | null,
    funding_type_id: p.funding_type_id as string | null,
    tenure_type_id: p.tenure_type_id as string | null,
    specialism_ids: (p.specialism_ids as string[]) ?? [],
    surgeries: p.surgeries as number | null,
    annual_turnover: p.annual_turnover as number | null,
  };
}

/** Ranked buyers for a practice. Includes excluded/do-not-contact rows flagged, greyed by the UI. */
export async function getMatchingBuyers(practiceId: string): Promise<BuyerMatchRow[]> {
  const supabase = await createClient();
  const lookupIndex = await getLookupIndex();

  const [{ data: practice }, { data: criteria }, { data: areas }, { data: exclusions }, { data: existingParties }] =
    await Promise.all([
      supabase.from("practices").select(PRACTICE_FIELDS).eq("id", practiceId).maybeSingle(),
      supabase
        .from("buyer_criteria")
        .select(
          "contact_id, min_price, max_price, specialism_ids, funding_type_ids, tenure_type_ids, min_surgeries, min_annual_turnover, contacts!buyer_criteria_contact_id_fkey(id, first_name, last_name, company_name, email, temperature, last_contacted_at, do_not_contact, consent_email, archived_at, roles)",
        ),
      supabase.from("buyer_search_areas").select("contact_id, lat, lng, radius_miles, region, label"),
      supabase.from("match_exclusions").select("contact_id").eq("practice_id", practiceId),
      supabase.from("practice_contacts").select("contact_id, role").eq("practice_id", practiceId),
    ]);
  if (!practice) return [];

  const mp = toMatchPractice(practice as Record<string, unknown>);
  const excludedIds = new Set((exclusions ?? []).map((e) => e.contact_id));
  const offerMakerIds = new Set(
    (existingParties ?? []).filter((p) => p.role === "buyer").map((p) => p.contact_id),
  );
  const areasByContact = new Map<string, MatchBuyer["areas"]>();
  for (const a of areas ?? []) {
    const list = areasByContact.get(a.contact_id) ?? [];
    list.push(a);
    areasByContact.set(a.contact_id, list);
  }

  const rows: BuyerMatchRow[] = [];
  for (const c of criteria ?? []) {
    const contact = c.contacts as unknown as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
      email: string | null;
      temperature: string | null;
      last_contacted_at: string | null;
      do_not_contact: boolean;
      consent_email: boolean | null;
      archived_at: string | null;
      roles: string[];
    } | null;
    if (!contact || contact.archived_at || !contact.roles.includes("buyer")) continue;
    if (offerMakerIds.has(contact.id)) continue; // already involved with this practice

    const buyer: MatchBuyer = {
      contact_id: c.contact_id,
      min_price: c.min_price,
      max_price: c.max_price,
      specialism_ids: c.specialism_ids ?? [],
      funding_type_ids: c.funding_type_ids ?? [],
      tenure_type_ids: c.tenure_type_ids ?? [],
      min_surgeries: c.min_surgeries,
      min_annual_turnover: c.min_annual_turnover,
      areas: areasByContact.get(c.contact_id) ?? [],
      last_contacted_at: contact.last_contacted_at,
      temperature: contact.temperature,
    };
    const result = matchBuyerToPractice(mp, buyer, (id) => lookupIndex.get(id)?.value);
    if (!result.matches) continue;
    rows.push({
      contact_id: contact.id,
      name:
        [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
        contact.company_name ||
        "Unnamed",
      email: contact.email,
      temperature: contact.temperature,
      last_contacted_at: contact.last_contacted_at,
      do_not_contact: contact.do_not_contact,
      consent_email: contact.consent_email,
      score: result.score,
      facets: result.facets,
      excluded: excludedIds.has(contact.id),
    });
  }
  return rows.sort((a, b) => Number(a.excluded) - Number(b.excluded) || b.score - a.score);
}

/** Ranked available practices for a buyer. */
export async function getMatchingPractices(contactId: string): Promise<PracticeMatchRow[]> {
  const supabase = await createClient();
  const lookupIndex = await getLookupIndex();

  const [{ data: criteria }, { data: areas }, { data: contact }, { data: practices }, { data: exclusions }] =
    await Promise.all([
      supabase.from("buyer_criteria").select("*").eq("contact_id", contactId).maybeSingle(),
      supabase.from("buyer_search_areas").select("lat, lng, radius_miles, region, label").eq("contact_id", contactId),
      supabase
        .from("contacts")
        .select("temperature, last_contacted_at")
        .eq("id", contactId)
        .maybeSingle(),
      supabase.from("practices").select(PRACTICE_FIELDS).eq("status", "available").is("archived_at", null),
      supabase.from("match_exclusions").select("practice_id").eq("contact_id", contactId),
    ]);

  const buyer: MatchBuyer = {
    contact_id: contactId,
    min_price: criteria?.min_price ?? null,
    max_price: criteria?.max_price ?? null,
    specialism_ids: criteria?.specialism_ids ?? [],
    funding_type_ids: criteria?.funding_type_ids ?? [],
    tenure_type_ids: criteria?.tenure_type_ids ?? [],
    min_surgeries: criteria?.min_surgeries ?? null,
    min_annual_turnover: criteria?.min_annual_turnover ?? null,
    areas: areas ?? [],
    temperature: contact?.temperature ?? null,
    last_contacted_at: contact?.last_contacted_at ?? null,
  };
  const excludedIds = new Set((exclusions ?? []).map((e) => e.practice_id));

  const rows: PracticeMatchRow[] = [];
  for (const p of practices ?? []) {
    const result = matchBuyerToPractice(
      toMatchPractice(p as Record<string, unknown>),
      buyer,
      (id) => lookupIndex.get(id)?.value,
    );
    if (!result.matches) continue;
    rows.push({
      practice_id: p.id,
      ref: p.ref,
      display_title: p.display_title,
      town: p.town,
      status: p.status,
      asking_price: p.asking_price,
      funding: p.funding_type_id ? (lookupIndex.get(p.funding_type_id) ?? null) : null,
      surgeries: p.surgeries,
      score: result.score,
      facets: result.facets,
      excluded: excludedIds.has(p.id),
    });
  }
  return rows.sort((a, b) => Number(a.excluded) - Number(b.excluded) || b.score - a.score);
}
