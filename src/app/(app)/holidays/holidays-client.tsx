"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { HOLIDAY_LABEL, HOLIDAY_TONE, daysLabel, holidayDays, type DayPortion } from "@/lib/holiday-utils";
import type { HolidayRequest } from "@/lib/holidays";
import { cancelHolidayRequest, createHolidayRequest } from "@/lib/actions/holidays";

export function HolidaysClient({ requests }: { requests: HolidayRequest[] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Controlled so the form can adapt between a single day and a range.
  const [start, setStart] = React.useState(today);
  const [end, setEnd] = React.useState(today);
  const [singlePortion, setSinglePortion] = React.useState<DayPortion>("full");
  const [firstHalf, setFirstHalf] = React.useState(false); // range: start after lunch (pm)
  const [lastHalf, setLastHalf] = React.useState(false); // range: back at lunch (am)
  const [reason, setReason] = React.useState("");

  const single = start !== "" && start === end;
  const startPortion: DayPortion = single ? singlePortion : firstHalf ? "pm" : "full";
  const endPortion: DayPortion = single ? singlePortion : lastHalf ? "am" : "full";
  const preview = start && end && end >= start ? holidayDays(start, end, startPortion, endPortion) : 0;

  function openForm() {
    setStart(today);
    setEnd(today);
    setSinglePortion("full");
    setFirstHalf(false);
    setLastHalf(false);
    setReason("");
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createHolidayRequest({
      start_date: start,
      end_date: end,
      start_portion: startPortion,
      end_portion: endPortion,
      reason: reason || null,
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

  return (
    <>
      <Card>
        <CardHeader
          title={`My holiday (${requests.length})`}
          action={
            <Button size="sm" onClick={openForm} className="gap-1.5">
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
            {requests.map((r) => {
              const days = holidayDays(r.start_date, r.end_date, r.start_portion, r.end_portion);
              return (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-fg-1">
                        {r.start_date === r.end_date
                          ? formatDate(r.start_date)
                          : `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`}
                      </span>
                      <Badge tone={HOLIDAY_TONE[r.status]}>{HOLIDAY_LABEL[r.status]}</Badge>
                      <span className="text-xs text-fg-3">{daysLabel(days)}</span>
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
              );
            })}
          </ul>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title="Request holiday">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First day" htmlFor="h_start">
              <Input
                id="h_start"
                type="date"
                min={today}
                value={start}
                onChange={(e) => {
                  const v = e.target.value;
                  setStart(v);
                  if (end < v) setEnd(v);
                }}
                required
              />
            </Field>
            <Field label="Last day" htmlFor="h_end">
              <Input
                id="h_end"
                type="date"
                min={start || today}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </Field>
          </div>

          {single ? (
            <Field label="Length" htmlFor="h_length" hint="Take a full day or just a morning / afternoon">
              <Select id="h_length" value={singlePortion} onChange={(e) => setSinglePortion(e.target.value as DayPortion)}>
                <option value="full">Full day</option>
                <option value="am">Morning only (half day)</option>
                <option value="pm">Afternoon only (half day)</option>
              </Select>
            </Field>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-fg-1">
                <input
                  type="checkbox"
                  checked={firstHalf}
                  onChange={(e) => setFirstHalf(e.target.checked)}
                  className="h-4 w-4 accent-[#E4AD25]"
                />
                First day is a half day (from lunch)
              </label>
              <label className="flex items-center gap-2 text-sm text-fg-1">
                <input
                  type="checkbox"
                  checked={lastHalf}
                  onChange={(e) => setLastHalf(e.target.checked)}
                  className="h-4 w-4 accent-[#E4AD25]"
                />
                Last day is a half day (until lunch)
              </label>
            </div>
          )}

          <Field label="Note (optional)" htmlFor="h_reason" hint="Anything management should know">
            <Textarea id="h_reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </Field>

          <p className="text-xs text-fg-3">
            That&apos;s <span className="font-semibold text-fg-1">{daysLabel(preview)}</span>.
          </p>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || preview <= 0}>{busy ? "Sending…" : "Send request"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
