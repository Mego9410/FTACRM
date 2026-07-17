import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";
import { OffersClient } from "./offers-client";

export default async function PracticeOffersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: offers } = await supabase
    .from("offers")
    .select(
      "id, amount, status, offer_date, conditions, finance_status, accepted_at, contacts!offers_buyer_contact_id_fkey(id, first_name, last_name, company_name)",
    )
    .eq("practice_id", id)
    .order("created_at", { ascending: false });

  return (
    <OffersClient
      practiceId={id}
      offers={(offers ?? []).map((o) => {
        const buyer = o.contacts as unknown as {
          id: string;
          first_name: string | null;
          last_name: string | null;
          company_name: string | null;
        } | null;
        return {
          id: o.id,
          amount: o.amount,
          status: o.status,
          offer_date: o.offer_date,
          conditions: o.conditions,
          finance_status: o.finance_status,
          buyerId: buyer?.id ?? null,
          buyerName: buyer ? contactName(buyer) : "Unknown buyer",
        };
      })}
    />
  );
}
