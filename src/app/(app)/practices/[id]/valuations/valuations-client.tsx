"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { formatDateTime, formatGBP } from "@/lib/utils";
import { saveValuation } from "../activity-actions";

type Valuation = {
  id: string;
  appointment_at: string | null;
  duration_mins: number | null;
  booked: boolean;
  confirmed: boolean;
  price_from: number | null;
  price_to: number | null;
  seller_expectation: number | null;
  suggested_price: number | null;
  fee_percent: number | null;
  outcome: string | null;
  notes: string | null;
};

export function ValuationsClient({
  practiceId,
  valuations,
}: {
  practiceId: string;
  valuations: Valuation[];
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Valuation | "new" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const current = editing === "new" ? null : editing;

  const num = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").replace(/[,£\s]/g, "");
    return s === "" ? null : Number(s);
  };
  const toLocalInput = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const when = String(f.get("appointment_at") ?? "");
    const res = await saveValuation({
      id: current?.id,
      practice_id: practiceId,
      appointment_at: when ? new Date(when).toISOString() : null,
      duration_mins: Number(f.get("duration_mins")) || 60,
      booked: f.get("booked") === "on",
      confirmed: f.get("confirmed") === "on",
      price_from: num(f.get("price_from")),
      price_to: num(f.get("price_to")),
      seller_expectation: num(f.get("seller_expectation")),
      suggested_price: num(f.get("suggested_price")),
      fee_percent: num(f.get("fee_percent")),
      outcome: (String(f.get("outcome") ?? "") || null) as "pending" | "instructed" | "declined" | null,
      notes: String(f.get("notes") ?? "") || null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>Add valuation</Button>
      </div>

      {valuations.length === 0 ? (
        <EmptyState title="No valuations yet" body="Record the valuation appointment and outcome — booked appointments appear on the calendar." />
      ) : (
        <div className="space-y-3">
          {valuations.map((v) => (
            <Card key={v.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-fg-1">
                    {v.appointment_at ? formatDateTime(v.appointment_at) : "No appointment set"}
                  </span>
                  {v.booked ? <Badge tone="gold">Booked</Badge> : null}
                  {v.confirmed ? <Badge tone="green">Confirmed</Badge> : null}
                  {v.outcome ? (
                    <Badge tone={v.outcome === "instructed" ? "green" : v.outcome === "declined" ? "danger" : "neutral"} className="capitalize">
                      {v.outcome}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-fg-3">
                  {[
                    v.price_from || v.price_to
                      ? `Range ${formatGBP(v.price_from)} – ${formatGBP(v.price_to)}`
                      : null,
                    v.seller_expectation ? `Seller hopes ${formatGBP(v.seller_expectation)}` : null,
                    v.suggested_price ? `Suggested ${formatGBP(v.suggested_price)}` : null,
                    v.fee_percent ? `Fee ${v.fee_percent}%` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No figures recorded"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(v)}>Edit</Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={current ? "Edit valuation" : "Add valuation"} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Appointment" htmlFor="va_when">
              <Input id="va_when" name="appointment_at" type="datetime-local" defaultValue={toLocalInput(current?.appointment_at ?? null)} />
            </Field>
            <Field label="Duration (mins)" htmlFor="va_duration">
              <Input id="va_duration" name="duration_mins" type="number" min={15} step={15} defaultValue={current?.duration_mins ?? 60} />
            </Field>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-fg-1">
              <input type="checkbox" name="booked" defaultChecked={current?.booked} className="h-4 w-4 accent-[#E4AD25]" />
              Appointment booked
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-fg-1">
              <input type="checkbox" name="confirmed" defaultChecked={current?.confirmed} className="h-4 w-4 accent-[#E4AD25]" />
              Confirmed with seller
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Price from (£)" htmlFor="va_from">
              <Input id="va_from" name="price_from" inputMode="numeric" defaultValue={current?.price_from ?? ""} />
            </Field>
            <Field label="Price to (£)" htmlFor="va_to">
              <Input id="va_to" name="price_to" inputMode="numeric" defaultValue={current?.price_to ?? ""} />
            </Field>
            <Field label="Seller expectation (£)" htmlFor="va_expect">
              <Input id="va_expect" name="seller_expectation" inputMode="numeric" defaultValue={current?.seller_expectation ?? ""} />
            </Field>
            <Field label="Suggested (£)" htmlFor="va_suggest">
              <Input id="va_suggest" name="suggested_price" inputMode="numeric" defaultValue={current?.suggested_price ?? ""} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fee %" htmlFor="va_fee">
              <Input id="va_fee" name="fee_percent" type="number" step="0.1" min={0} max={100} defaultValue={current?.fee_percent ?? ""} />
            </Field>
            <Field label="Outcome" htmlFor="va_outcome">
              <Select id="va_outcome" name="outcome" defaultValue={current?.outcome ?? "pending"}>
                <option value="pending">Pending</option>
                <option value="instructed">Instructed</option>
                <option value="declined">Declined</option>
              </Select>
            </Field>
          </div>
          <Field label="Notes" htmlFor="va_notes">
            <Textarea id="va_notes" name="notes" defaultValue={current?.notes ?? ""} rows={3} />
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
