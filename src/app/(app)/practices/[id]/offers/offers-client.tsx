"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { ContactPicker, type PickedContact } from "@/components/record/contact-picker";
import { cn, formatDate, formatGBP } from "@/lib/utils";
import { acceptOffer, addOffer, updateOfferStatus } from "../activity-actions";

type Offer = {
  id: string;
  amount: number;
  status: string;
  offer_date: string;
  conditions: string | null;
  finance_status: string | null;
  buyerId: string | null;
  buyerName: string;
};

const STATUS_TONES: Record<string, "gold" | "green" | "neutral" | "danger" | "warn"> = {
  pending: "gold",
  accepted: "green",
  declined: "neutral",
  withdrawn: "neutral",
  fallen_through: "danger",
};

export function OffersClient({ practiceId, offers }: { practiceId: string; offers: Offer[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<PickedContact | null>(null);
  const [filter, setFilter] = React.useState("all");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const counts = offers.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const visible = filter === "all" ? offers : offers.filter((o) => o.status === filter);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!picked) return setError("Pick the buyer making the offer.");
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await addOffer({
      practice_id: practiceId,
      buyer_contact_id: picked.id,
      amount: Number(String(f.get("amount")).replace(/[,£\s]/g, "")),
      conditions: String(f.get("conditions") ?? "") || null,
      finance_status: (String(f.get("finance_status") ?? "") || null) as
        | "cash"
        | "mortgage_agreed"
        | "mortgage_needed"
        | "unknown"
        | null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    setPicked(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {["all", "pending", "accepted", "declined", "withdrawn", "fallen_through"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                filter === s ? "bg-gold-tint text-gold-deep" : "text-fg-3 hover:bg-surface-3",
              )}
            >
              {s.replace("_", " ")}
              {s !== "all" && counts[s] ? ` (${counts[s]})` : ""}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>Add offer</Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No offers yet" body="Add the first offer when a buyer commits." />
      ) : (
        <div className="space-y-3">
          {visible.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[17px] font-extrabold text-fg-1">{formatGBP(o.amount)}</span>
                  <Badge tone={STATUS_TONES[o.status] ?? "neutral"} className="capitalize">
                    {o.status.replace("_", " ")}
                  </Badge>
                  {o.finance_status ? (
                    <Badge className="capitalize">{o.finance_status.replace("_", " ")}</Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-fg-3">
                  {o.buyerId ? (
                    <Link href={`/contacts/${o.buyerId}`} className="font-semibold text-gold-deep hover:underline">
                      {o.buyerName}
                    </Link>
                  ) : (
                    o.buyerName
                  )}
                  {" · "}
                  {formatDate(o.offer_date)}
                  {o.conditions ? ` · ${o.conditions}` : ""}
                </p>
              </div>
              {o.status === "pending" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Accept ${formatGBP(o.amount)} from ${o.buyerName}? Other pending offers will be declined and a deal created.`,
                        )
                      )
                        return;
                      const res = await acceptOffer({ id: o.id, practice_id: practiceId });
                      if (!res.ok) return window.alert(res.error);
                      const dealId = (res.data as { dealId: string } | undefined)?.dealId;
                      if (dealId) router.push(`/deals/${dealId}`);
                      else router.refresh();
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await updateOfferStatus({ id: o.id, practice_id: practiceId, status: "declined" });
                      router.refresh();
                    }}
                  >
                    Decline
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Add offer">
        <form onSubmit={submit} className="space-y-4">
          {picked ? (
            <div className="flex items-center justify-between rounded-sm border border-line px-3 py-2">
              <span className="text-sm font-semibold text-fg-1">{picked.label}</span>
              <button type="button" onClick={() => setPicked(null)} className="text-fg-3 hover:text-danger">
                <X size={15} />
              </button>
            </div>
          ) : (
            <ContactPicker onPick={setPicked} autoFocus placeholder="Search for the buyer…" />
          )}
          <Field label="Offer amount (£)" htmlFor="of_amount">
            <Input id="of_amount" name="amount" inputMode="numeric" required placeholder="650,000" />
          </Field>
          <Field label="Finance position" htmlFor="of_finance">
            <Select id="of_finance" name="finance_status" defaultValue="">
              <option value="">Unknown</option>
              <option value="cash">Cash</option>
              <option value="mortgage_agreed">Finance agreed</option>
              <option value="mortgage_needed">Finance needed</option>
            </Select>
          </Field>
          <Field label="Conditions" htmlFor="of_conditions">
            <Textarea id="of_conditions" name="conditions" rows={2} placeholder="Subject to…" />
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !picked}>{busy ? "Saving…" : "Add offer"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
