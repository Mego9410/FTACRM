"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui/primitives";
import { ContactPicker, type PickedContact } from "@/components/record/contact-picker";
import { updateDealFields } from "../../actions";

export function DealSolicitors({
  dealId,
  buyerSolicitorId,
  sellerSolicitorId,
  targetCompletion,
  ownerId,
}: {
  dealId: string;
  buyerSolicitorId: string | null;
  sellerSolicitorId: string | null;
  targetCompletion: string | null;
  ownerId: string | null;
}) {
  const router = useRouter();
  const [buyerSol, setBuyerSol] = React.useState<PickedContact | null>(null);
  const [sellerSol, setSellerSol] = React.useState<PickedContact | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function save() {
    setBusy(true);
    await updateDealFields({
      deal_id: dealId,
      target_completion_date: targetCompletion,
      owner_id: ownerId,
      buyer_solicitor_id: buyerSol?.id ?? buyerSolicitorId,
      seller_solicitor_id: sellerSol?.id ?? sellerSolicitorId,
    });
    setBusy(false);
    setBuyerSol(null);
    setSellerSol(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title="Assign solicitors" />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Buyer's solicitor</p>
          {buyerSol ? (
            <div className="flex items-center justify-between rounded-sm border border-line px-3 py-2">
              <span className="text-sm font-semibold text-fg-1">{buyerSol.label}</span>
              <button type="button" onClick={() => setBuyerSol(null)} className="text-fg-3 hover:text-danger">
                <X size={14} />
              </button>
            </div>
          ) : (
            <ContactPicker onPick={setBuyerSol} placeholder="Search solicitors…" />
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Seller's solicitor</p>
          {sellerSol ? (
            <div className="flex items-center justify-between rounded-sm border border-line px-3 py-2">
              <span className="text-sm font-semibold text-fg-1">{sellerSol.label}</span>
              <button type="button" onClick={() => setSellerSol(null)} className="text-fg-3 hover:text-danger">
                <X size={14} />
              </button>
            </div>
          ) : (
            <ContactPicker onPick={setSellerSol} placeholder="Search solicitors…" />
          )}
        </div>
        {(buyerSol ?? sellerSol) ? (
          <Button size="sm" onClick={() => void save()} disabled={busy} className="sm:col-span-2">
            {busy ? "Saving…" : "Save solicitors"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
