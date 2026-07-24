import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type FirmSettings = {
  id: string;
  company_name: string;
  trading_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  default_fee_percent: number | null;
  default_min_fee: string | null;
  email_from: string | null;
  email_reply_to: string | null;
};

const FALLBACK: FirmSettings = {
  id: "",
  company_name: "Frank Taylor & Associates",
  trading_name: null,
  address: null,
  phone: null,
  email: null,
  website: null,
  logo_url: null,
  default_fee_percent: 3,
  default_min_fee: "£12,000",
  email_from: null,
  email_reply_to: null,
};

/** The firm-wide settings singleton. Tolerant of the table being un-migrated. */
export const getFirmSettings = cache(async (): Promise<FirmSettings> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("firm_settings")
      .select(
        "id, company_name, trading_name, address, phone, email, website, logo_url, default_fee_percent, default_min_fee, email_from, email_reply_to",
      )
      .order("created_at")
      .limit(1)
      .maybeSingle();
    return data ? (data as FirmSettings) : FALLBACK;
  } catch {
    return FALLBACK;
  }
});
