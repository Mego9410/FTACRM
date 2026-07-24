"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLookupIndex } from "@/lib/lookups";
import { toCsv } from "@/lib/csv";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const CAP = 5000;
const COLUMNS = "id, ref, display_title, name, status, funding_type_id, tenure_type_id, town, county, postcode, asking_price, price_prefix, surgeries, annual_turnover, created_at";
const HEADERS = ["Ref", "Marketing title", "Trading name", "Status", "Funding", "Tenure", "Town", "County", "Postcode", "Asking price", "Price basis", "Surgeries", "Annual turnover"];

type Row = {
  ref: string; display_title: string | null; name: string | null; status: string;
  funding_type_id: string | null; tenure_type_id: string | null; town: string | null; county: string | null;
  postcode: string | null; asking_price: number | null; price_prefix: string | null; surgeries: number | null; annual_turnover: number | null;
};

async function rowsToCsv(rows: Row[]): Promise<string> {
  const lookups = await getLookupIndex();
  const name = (id: string | null) => (id ? lookups.get(id)?.value ?? "" : "");
  return toCsv(
    HEADERS,
    rows.map((p) => [
      p.ref, p.display_title, p.name, p.status, name(p.funding_type_id), name(p.tenure_type_id),
      p.town, p.county, p.postcode, p.asking_price, p.price_prefix, p.surgeries, p.annual_turnover,
    ]),
  );
}

const filename = () => `practices-${new Date().toISOString().slice(0, 10)}.csv`;

/** Export practices respecting the main list filters. */
export async function exportPracticesCsv(input: unknown): Promise<ActionResult<{ filename: string; csv: string }>> {
  await requireProfile();
  const parsed = z
    .object({ q: z.string().optional(), status: z.string().optional(), funding: z.string().optional(), min: z.string().optional(), max: z.string().optional(), offmarket: z.string().optional() })
    .safeParse(input ?? {});
  if (!parsed.success) return fail("Invalid filters.");
  const supabase = await createClient();

  let query = supabase.from("practices").select(COLUMNS).is("archived_at", null).limit(CAP);
  const d = parsed.data;
  if (d.status === "live") query = query.in("status", ["available", "under_offer", "sold_stc"]);
  else if (d.status) query = query.eq("status", d.status);
  else if (d.offmarket !== "1") query = query.not("status", "in", "(withdrawn,completed)");
  if (d.funding) query = query.eq("funding_type_id", d.funding);
  if (d.min) query = query.gte("asking_price", Number(d.min));
  if (d.max) query = query.lte("asking_price", Number(d.max));
  if (d.q) {
    const like = `%${d.q.replace(/[%_]/g, "")}%`;
    query = query.or(`display_title.ilike.${like},name.ilike.${like},town.ilike.${like},postcode.ilike.${like},ref.ilike.${like}`);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return dbFail(error);
  return ok({ filename: filename(), csv: await rowsToCsv((data ?? []) as Row[]) });
}

export async function exportPracticesByIds(input: unknown): Promise<ActionResult<{ filename: string; csv: string }>> {
  await requireProfile();
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(CAP) }).safeParse(input);
  if (!parsed.success) return fail("Nothing selected.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("practices").select(COLUMNS).in("id", parsed.data.ids);
  if (error) return dbFail(error);
  return ok({ filename: filename(), csv: await rowsToCsv((data ?? []) as Row[]) });
}

/** Bulk take practices off the market (status → withdrawn). They stay on the database. */
export async function bulkWithdrawPractices(input: unknown): Promise<ActionResult<{ count: number }>> {
  await requireProfile();
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(CAP) }).safeParse(input);
  if (!parsed.success) return fail("Nothing selected.");
  const supabase = await createClient();
  const { error } = await supabase.from("practices").update({ status: "withdrawn" }).in("id", parsed.data.ids);
  if (error) return dbFail(error);
  revalidatePath("/practices");
  return ok({ count: parsed.data.ids.length });
}
