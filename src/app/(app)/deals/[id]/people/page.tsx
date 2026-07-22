import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";
import { Avatar, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { DealSolicitors } from "./deal-solicitors";

export default async function DealPeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: deal } = await supabase
    .from("deals")
    .select(
      `id, buyer_solicitor_id, seller_solicitor_id, target_completion_date, owner_id,
       buyer:contacts!deals_buyer_contact_id_fkey(id, first_name, last_name, company_name, email, phone, mobile),
       seller:contacts!deals_seller_contact_id_fkey(id, first_name, last_name, company_name, email, phone, mobile),
       buyer_sol:contacts!deals_buyer_solicitor_id_fkey(id, first_name, last_name, company_name, email, phone, mobile),
       seller_sol:contacts!deals_seller_solicitor_id_fkey(id, first_name, last_name, company_name, email, phone, mobile)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!deal) notFound();

  type C = { id: string; first_name: string | null; last_name: string | null; company_name: string | null; email: string | null; phone: string | null; mobile: string | null } | null;
  const parties: { label: string; contact: C }[] = [
    { label: "Buyer", contact: deal.buyer as unknown as C },
    { label: "Seller", contact: deal.seller as unknown as C },
    { label: "Buyer's solicitor", contact: deal.buyer_sol as unknown as C },
    { label: "Seller's solicitor", contact: deal.seller_sol as unknown as C },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Parties" />
        {parties.every((p) => !p.contact) ? (
          <EmptyState className="m-4" title="No parties recorded" />
        ) : (
          <ul className="divide-y divide-line">
            {parties
              .filter((p) => p.contact)
              .map((p) => (
                <li key={p.label} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={contactName(p.contact!)} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/contacts/${p.contact!.id}`} className="min-w-0 truncate text-sm font-semibold text-fg-1 hover:underline">
                        {contactName(p.contact!)}
                      </Link>
                      <span className="text-xs font-bold uppercase tracking-wide text-fg-4">{p.label}</span>
                    </div>
                    <p className="text-xs text-fg-3">
                      {[p.contact!.email, p.contact!.mobile ?? p.contact!.phone].filter(Boolean).join(" · ") || "No contact details"}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <DealSolicitors
        dealId={id}
        buyerSolicitorId={deal.buyer_solicitor_id}
        sellerSolicitorId={deal.seller_solicitor_id}
        targetCompletion={deal.target_completion_date}
        ownerId={deal.owner_id}
      />
    </div>
  );
}
