"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { HOLIDAY_LABEL, HOLIDAY_TONE, workingDays } from "@/lib/holiday-utils";
import type { HolidayRequest } from "@/lib/holidays";
import { cancelHolidayRequest, createHolidayRequest } from "@/lib/actions/holidays";

export function HolidaysClient({ requests }: { requests: HolidayRequest[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await createHolidayRequest({
      start_date: String(f.get("start_date")),
      end_date: String(f.get("end_date")),
      reason: String(f.get("reason") ?? "") || null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    router.refresh();
  }

  async function cancel(id: string) {
    if (!window.confirm("Cancel this holiday request?")) return;
    const res = await cancelHolidayRequest({ id });
    if (!res.ok) return window.alert(res.error);
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Card>
        <CardHeader
          title={`My holiday (${requests.length})`}
          action={
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
              <CalendarPlus size={14} /> Request holiday
            </Button>
          }
        />
        {requests.length === 0 ? (
          <EmptyState
            className="m-4"
            title="No holiday requests yet"
            body="Request some time off and it'll be sent to management for approval."
          />
        ) : (
          <ul className="divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-fg-1">
                      {r.start_date === r.end_date
                        ? formatDate(r.start_date)
                        : `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`}
                    </span>
                    <Badge tone={HOLIDAY_TONE[r.status]}>{HOLIDAY_LABEL[r.status]}</Badge>
                    <span className="text-xs text-fg-3">
                      {workingDays(r.start_date, r.end_date)} working day
                      {workingDays(r.start_date, r.end_date) === 1 ? "" : "s"}
                    </span>
                  </div>
                  {r.reason ? <p className="mt-1 text-xs text-fg-3">{r.reason}</p> : null}
                  {r.status === "rejected" && r.decision_note ? (
                    <p className="mt-1 text-xs font-medium text-danger">Management note: {r.decision_note}</p>
                  ) : null}
                  {r.status === "approved" && r.decision_note ? (
                    <p className="mt-1 text-xs text-private-fg">Management note: {r.decision_note}</p>
                  ) : null}
                </div>
                {r.status === "pending" || r.status === "approved" ? (
                  <Button variant="ghost" size="sm" onClick={() => cancel(r.id)}>
                    Cancel
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Request holiday">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First day" htmlFor="h_start">
              <Input id="h_start" name="start_date" type="date" defaultValue={today} min={today} required />
            </Field>
            <Field label="Last day" htmlFor="h_end">
              <Input id="h_end" name="end_date" type="date" defaultValue={today} min={today} required />
            </Field>
          </div>
          <Field label="Note (optional)" htmlFor="h_reason" hint="Anything management should know">
            <Textarea id="h_reason" name="reason" rows={2} />
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
