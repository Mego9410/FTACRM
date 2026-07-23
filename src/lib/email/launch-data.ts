import { createClient } from "@/lib/supabase/server";
import { getLookupIndex } from "@/lib/lookups";
import type { LaunchPractice } from "@/lib/email/launch-template";

export const LAUNCH_PRACTICE_FIELDS =
  "id, ref, display_title, name, address_line1, town, county, postcode, status, asking_price, price_prefix, surgeries, udas, staff_count, annual_turnover, ebitda, reconstituted_profit, nhs_contract_value, established_year, funding_type_id, tenure_type_id, trading_entity_id, specialism_ids, description";

/** Load a practice and resolve lookups into the LaunchPractice email shape. */
export async function loadLaunchPractice(practiceId: string): Promise<LaunchPractice | null> {
  const supabase = await createClient();
  const [{ data: p }, lookupIndex] = await Promise.all([
    supabase.from("practices").select(LAUNCH_PRACTICE_FIELDS).eq("id", practiceId).maybeSingle(),
    getLookupIndex(),
  ]);
  if (!p) return null;
  const row = p as Record<string, unknown>;
  return {
    ref: row.ref as string,
    display_title: row.display_title as string,
    name: row.name as string | null,
    address_line1: row.address_line1 as string | null,
    town: row.town as string | null,
    county: row.county as string | null,
    postcode: row.postcode as string | null,
    asking_price: row.asking_price as number | null,
    price_prefix: (row.price_prefix as string) ?? "guide",
    surgeries: row.surgeries as number | null,
    udas: row.udas as number | null,
    staff_count: row.staff_count as number | null,
    annual_turnover: row.annual_turnover as number | null,
    ebitda: row.ebitda as number | null,
    reconstituted_profit: row.reconstituted_profit as number | null,
    nhs_contract_value: row.nhs_contract_value as number | null,
    established_year: row.established_year as number | null,
    funding: row.funding_type_id ? (lookupIndex.get(row.funding_type_id as string)?.value ?? null) : null,
    tenure: row.tenure_type_id ? (lookupIndex.get(row.tenure_type_id as string)?.value ?? null) : null,
    trading_entity: row.trading_entity_id ? (lookupIndex.get(row.trading_entity_id as string)?.value ?? null) : null,
    specialisms: ((row.specialism_ids as string[]) ?? [])
      .map((id) => lookupIndex.get(id)?.value)
      .filter((v): v is string => Boolean(v)),
    description: row.description as string | null,
  };
}
