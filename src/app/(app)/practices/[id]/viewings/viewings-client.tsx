"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { ContactPicker, type PickedContact } from "@/components/record/contact-picker";
import { formatDateTime } from "@/lib/utils";
import { saveViewing } from "../activity-actions";

type Viewing = {
  id: string;
  scheduled_at: string;
  duration_mins: number | null;
  status: string;
  feedback: string | null;
  buyerId: string | null;
  buyerName: string;
};

const STATUS_TONES: Record<string, "gold" | "green" | "neutral" | "danger"> = {
  requested: "gold",
  confirmed: "green",
  completed: "neutral",
  cancelled: "neutral",
  no_show: "danger",
};

export function ViewingsClient({ practiceId, viewings }: { practiceId: string; viewings: Viewing[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Viewing | null>(null);
  const [picked, setPicked] = React.useState<PickedContact | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const overdueFeedback = (v: Viewing) =>
    v.status === "completed" && !v.feedback;

  async function submitNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!picked) return setError("Pick the buyer viewing.");
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await saveViewing({
      practice_id: practiceId,
      buyer_contact_id: picked.id,
      scheduled_at: new Date(String(f.get("scheduled_at"))).toISOString(),
      duration_mins: Number(f.get("duration_mins")) || 60,
      status: "requested",
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    setPicked(null);
    router.refresh();
  }

  async function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing?.buyerId) return;
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await saveViewing({
      id: editing.id,
      practice_id: practiceId,
      buyer_contact_id: editing.buyerId,
      scheduled_at: new Date(String(f.get("scheduled_at"))).toISOString(),
      duration_mins: Number(f.get("duration_mins")) || 60,
      status: String(f.get("status")) as "requested" | "confirmed" | "completed" | "cancelled" | "no_show",
      feedback: String(f.get("feedback") ?? "") || null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>Book viewing</Button>
      </div>

      {viewings.length === 0 ? (
        <EmptyState title="No viewings yet" body="Book a viewing to introduce a buyer — it goes straight onto the calendar." />
      ) : (
        <div className="space-y-3">
          {viewings.map((v) => (
            <Card key={v.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-fg-1">{formatDateTime(v.scheduled_at)}</span>
                  <Badge tone={STATUS_TONES[v.status] ?? "neutral"} className="capitalize">
                    {v.status.replace("_", " ")}
                  </Badge>
                  {overdueFeedback(v) ? <Badge tone="warn">Feedback needed</Badge> : null}
                </div>
                <p className="mt-0.5 text-xs text-fg-3">
                  {v.buyerId ? (
                    <Link href={`/contacts/${v.buyerId}`} className="font-semibold text-gold-deep hover:underline">
                      {v.buyerName}
                    </Link>
                  ) : (
                    v.buyerName
                  )}
                  {v.duration_mins ? ` · ${v.duration_mins} mins` : ""}
                  {v.feedback ? ` · “${v.feedback.slice(0, 120)}${v.feedback.length > 120 ? "…" : ""}”` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(v)}>
                Update
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Book viewing">
        <form onSubmit={submitNew} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="When" htmlFor="vw_when">
              <Input id="vw_when" name="scheduled_at" type="datetime-local" required />
            </Field>
            <Field label="Duration (mins)" htmlFor="vw_duration">
              <Input id="vw_duration" name="duration_mins" type="number" min={15} step={15} defaultValue={60} />
            </Field>
          </div>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !picked}>{busy ? "Booking…" : "Book viewing"}</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={`Viewing — ${editing?.buyerName ?? ""}`}>
        {editing ? (
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="When" htmlFor="ve_when">
                <Input id="ve_when" name="scheduled_at" type="datetime-local" defaultValue={toLocalInput(editing.scheduled_at)} required />
              </Field>
              <Field label="Duration (mins)" htmlFor="ve_duration">
                <Input id="ve_duration" name="duration_mins" type="number" min={15} step={15} defaultValue={editing.duration_mins ?? 60} />
              </Field>
            </div>
            <Field label="Status" htmlFor="ve_status">
              <Select id="ve_status" name="status" defaultValue={editing.status}>
                <option value="requested">Requested</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No show</option>
              </Select>
            </Field>
            <Field label="Feedback" htmlFor="ve_feedback" hint="What did the buyer think?">
              <Textarea id="ve_feedback" name="feedback" defaultValue={editing.feedback ?? ""} rows={3} />
            </Field>
            {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}
