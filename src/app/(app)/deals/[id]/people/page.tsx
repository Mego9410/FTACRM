import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";
import { Avatar, Card, CardHeader, EmptyState } from "@/components/ui/primitives";

const ROLE_LABEL: Record<string, string> = {
  buyer_solicitor: "Buyer's solicitor",
  seller_solicitor: "Seller's solicitor",
  accountant: "Accountant",
  other: "Other",
};

export default async function DealPeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Buyer/seller are the deal's own record (the parties at agreement). Solicitors
  // and other advisers live on the practice — the single source — so we read them
  // from practice_contacts rather than duplicating them on the deal.
  const { data: deal } = await supabase
    .from("deals")
    .select(
      `id, practice_id,
       buyer:contacts!deals_buyer_contact_id_fkey(id, first_name, last_name, company_name, email, phone, mobile),
       seller:contacts!deals_seller_contact_id_fkey(id, first_name, last_name, company_name, email, phone, mobile)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!deal) notFound();

  const { data: advisers } = await supabase
    .from("practice_contacts")
    .select(
      "role, contacts!practice_contacts_contact_id_fkey(id, first_name, last_name, company_name, email, phone, mobile)",
    )
    .eq("practice_id", deal.practice_id)
    .in("role", ["buyer_solicitor", "seller_solicitor", "accountant", "other"]);

  type C = { id: string; first_name: string | null; last_name: string | null; company_name: string | null; email: string | null; phone: string | null; mobile: string | null } | null;
  const parties: { label: string; contact: C }[] = [
    { label: "Buyer", contact: deal.buyer as unknown as C },
    { label: "Seller", contact: deal.seller as unknown as C },
    ...(advisers ?? []).map((a) => ({
      label: ROLE_LABEL[a.role] ?? a.role,
      contact: a.contacts as unknown as C,
    })),
  ].filter((p) => p.contact);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Parties" />
        {parties.length === 0 ? (
          <EmptyState className="m-4" title="No parties recorded" />
        ) : (
          <ul className="divide-y divide-line">
            {parties.map((p) => (
              <li key={`${p.label}-${p.contact!.id}`} className="flex items-center gap-3 px-5 py-3">
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

      <p className="text-sm text-fg-3">
        Solicitors and other advisers are managed on the{" "}
        <Link href={`/practices/${deal.practice_id}/people`} className="font-semibold text-gold-deep hover:underline">
          practice's People tab
        </Link>{" "}
        so there's a single record for everyone involved.
      </p>
    </div>
  );
}
