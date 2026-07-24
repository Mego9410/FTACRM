"use server";

import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";
import { practiceLabel } from "@/lib/practice-helpers";
import { toCsv } from "@/lib/csv";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const CAP = 5000;
const STALLED_DAYS = 14;
const SELECT = `id, ref, status, agreed_price, target_completion_date, last_activity_at, completed_at, created_at,
  practices!deals_practice_id_fkey(display_title, name, county, ref),
  buyer:contacts!deals_buyer_contact_id_fkey(first_name, last_name, company_name),
  seller:contacts!deals_seller_contact_id_fkey(first_name, last_name, company_name),
  deal_stages!deals_current_stage_id_fkey(label)`;
const HEADERS = ["Ref", "Practice", "Practice ref", "Status", "Current stage", "Agreed price", "Buyer", "Seller", "Target completion", "Last activity"];

type Row = {
  ref: string; status: string; agreed_price: number | null; target_completion_date: string | null; last_activity_at: string;
  practices: { display_title: string; name: string | null; county: string | null; ref: string } | null;
  buyer: { first_name: string | null; last_name: string | null; company_name: string | null } | null;
  seller: { first_name: string | null; last_name: string | null; company_name: string | null } | null;
  deal_stages: { label: string } | null;
};

function rowsToCsv(rows: Row[]): string {
  return toCsv(
    HEADERS,
    rows.map((d) => [
      d.ref,
      d.practices ? practiceLabel(d.practices) : "",
      d.practices?.ref ?? "",
      d.status,
      d.deal_stages?.label ?? "",
      d.agreed_price,
      d.buyer ? contactName(d.buyer) : "",
      d.seller ? contactName(d.seller) : "",
      d.target_completion_date,
      d.last_activity_at ? d.last_activity_at.slice(0, 10) : "",
    ]),
  );
}

const filename = () => `deals-${new Date().toISOString().slice(0, 10)}.csv`;

/** Export deals respecting the main list filters (status tab + stalled). */
export async function exportDealsCsv(input: unknown): Promise<ActionResult<{ filename: string; csv: string }>> {
  await requireProfile();
  const parsed = z.object({ status: z.string().optional(), stalled: z.string().optional() }).safeParse(input ?? {});
  if (!parsed.success) return fail("Invalid filters.");
  const supabase = await createClient();

  let query = supabase.from("deals").select(SELECT).limit(CAP);
  const status = parsed.data.status ?? "in_progress";
  if (status !== "all") query = query.eq("status", status);
  if (parsed.data.stalled === "1") {
    query = query.lt("last_activity_at", new Date(Date.now() - STALLED_DAYS * 86_400_000).toISOString());
  }
  const { data, error } = await query.order("last_activity_at", { ascending: true });
  if (error) return dbFail(error);
  return ok({ filename: filename(), csv: rowsToCsv((data ?? []) as unknown as Row[]) });
}

export async function exportDealsByIds(input: unknown): Promise<ActionResult<{ filename: string; csv: string }>> {
  await requireProfile();
  const parsed = z.object({ ids: z.array(z.string().uuid()).min(1).max(CAP) }).safeParse(input);
  if (!parsed.success) return fail("Nothing selected.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("deals").select(SELECT).in("id", parsed.data.ids);
  if (error) return dbFail(error);
  return ok({ filename: filename(), csv: rowsToCsv((data ?? []) as unknown as Row[]) });
}
