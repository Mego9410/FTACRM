"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { Avatar, Button, Card, CardHeader } from "@/components/ui/primitives";
import { ContactPicker } from "@/components/record/contact-picker";
import { useToast } from "@/components/ui/toast";
import { setDealParty } from "../../actions";

type Party = { id: string; name: string; sub: string | null } | null;
type Field = "buyer_contact_id" | "seller_contact_id";

export function DealParties({ dealId, buyer, seller }: { dealId: string; buyer: Party; seller: Party }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = React.useState<Field | null>(null);

  async function set(field: Field, contact_id: string | null) {
    const res = await setDealParty({ deal_id: dealId, field, contact_id });
    setEditing(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Party updated.");
    router.refresh();
  }

  const rows: { field: Field; label: string; contact: Party }[] = [
    { field: "buyer_contact_id", label: "Buyer", contact: buyer },
    { field: "seller_contact_id", label: "Seller", contact: seller },
  ];

  return (
    <Card>
      <CardHeader title="Parties" />
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.field} className="px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs font-bold uppercase tracking-wide text-fg-4">{r.label}</span>
              {r.contact ? (
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar name={r.contact.name} size={30} />
                  <div className="min-w-0">
                    <Link href={`/contacts/${r.contact.id}`} className="block truncate text-sm font-semibold text-fg-1 hover:underline">
                      {r.contact.name}
                    </Link>
                    {r.contact.sub ? <span className="block truncate text-xs text-fg-3">{r.contact.sub}</span> : null}
                  </div>
                </div>
              ) : (
                <span className="flex-1 text-sm text-fg-3">Not set</span>
              )}
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(editing === r.field ? null : r.field)} className="gap-1">
                  <Pencil size={13} /> {r.contact ? "Change" : "Set"}
                </Button>
                {r.contact ? (
                  <button type="button" onClick={() => void set(r.field, null)} className="rounded p-1.5 text-fg-4 hover:bg-surface-3 hover:text-danger" aria-label={`Clear ${r.label}`}>
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </div>
            {editing === r.field ? (
              <div className="mt-2 pl-16">
                <ContactPicker autoFocus placeholder={`Search for the ${r.label.toLowerCase()}…`} onPick={(c) => void set(r.field, c.id)} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
