"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { HOLIDAY_LABEL, HOLIDAY_TONE, daysLabel, holidayDays } from "@/lib/holiday-utils";
import type { HolidayRequest } from "@/lib/holidays";
import { decideHolidayRequest } from "@/lib/actions/holidays";

function dateRange(r: HolidayRequest) {
  return r.start_date === r.end_date
    ? formatDate(r.start_date)
    : `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`;
}

function days(r: HolidayRequest) {
  return daysLabel(holidayDays(r.start_date, r.end_date, r.start_portion, r.end_portion));
}

type Dialog = { req: HolidayRequest; mode: "decline" | "edit" } | null;

export function HolidaysAdminClient({
  pending,
  decided,
}: {
  pending: HolidayRequest[];
  decided: HolidayRequest[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function approve(r: HolidayRequest) {
    setBusyId(r.id);
    setError(null);
    const res = await decideHolidayRequest({ id: r.id, decision: "approved", note: null });
    setBusyId(null);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  async function submitDialog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dialog) return;
    setBusyId(dialog.req.id);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await decideHolidayRequest({
      id: dialog.req.id,
      decision: dialog.mode === "decline" ? "rejected" : (String(f.get("decision")) as "approved" | "rejected"),
      note: String(f.get("note") ?? "") || null,
    });
    setBusyId(null);
    if (!res.ok) return setError(res.error);
    setDialog(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={`Awaiting approval (${pending.length})`} />
        {pending.length === 0 ? (
          <EmptyState className="m-4" title="Nothing to review" body="Holiday requests will appear here for approval." />
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 gap-3">
                  <Avatar name={r.requester_name ?? "?"} size={34} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg-1">{r.requester_name ?? "Unknown"}</p>
                    <p className="text-sm text-fg-2">
                      {dateRange(r)}
                      <span className="text-fg-3">{" · "}{days(r)}</span>
                    </p>
                    {r.reason ? <p className="mt-1 text-xs text-fg-3">{r.reason}</p> : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDialog({ req: r, mode: "decline" })} disabled={busyId === r.id}>
                    Decline
                  </Button>
                  <Button size="sm" onClick={() => approve(r)} disabled={busyId === r.id}>
                    {busyId === r.id ? "Saving…" : "Approve"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && !dialog ? <p className="px-5 pb-3 text-sm font-medium text-danger">{error}</p> : null}
      </Card>

      <Card>
        <CardHeader title="Recently decided" />
        {decided.length === 0 ? (
          <EmptyState className="m-4" title="No decisions yet" />
        ) : (
          <ul className="divide-y divide-line">
            {decided.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-fg-1">{r.requester_name ?? "Unknown"}</span>
                    <span className="text-sm text-fg-2">{dateRange(r)}</span>
                    <Badge tone={HOLIDAY_TONE[r.status]}>{HOLIDAY_LABEL[r.status]}</Badge>
                  </div>
                  {r.decision_note ? <p className="mt-1 text-xs text-fg-3">Note: {r.decision_note}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-fg-4">
                    {r.decider_name ? `${r.decider_name}` : ""}
                    {r.decided_at ? ` · ${formatDate(r.decided_at)}` : ""}
                  </span>
                  {r.status === "approved" || r.status === "rejected" ? (
                    <Button variant="ghost" size="sm" onClick={() => setDialog({ req: r, mode: "edit" })}>
                      Edit
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.mode === "decline" ? "Decline holiday request" : "Edit decision"}
      >
        {dialog ? (
          <form key={dialog.req.id + dialog.mode} onSubmit={submitDialog} className="space-y-4">
            <p className="text-sm text-fg-2">
              {dialog.req.requester_name} — {dateRange(dialog.req)}
              <span className="text-fg-3">{" · "}{days(dialog.req)}</span>
            </p>
            {dialog.mode === "edit" ? (
              <Field label="Outcome" htmlFor="decision">
                <Select id="decision" name="decision" defaultValue={dialog.req.status === "approved" ? "approved" : "rejected"}>
                  <option value="approved">Approved</option>
                  <option value="rejected">Declined</option>
                </Select>
              </Field>
            ) : null}
            <Field
              label="Note"
              htmlFor="decision_note"
              hint="Shown to the requester — e.g. why a request was declined"
            >
              <Textarea
                id="decision_note"
                name="note"
                rows={3}
                defaultValue={dialog.req.decision_note ?? ""}
                placeholder="e.g. Too many people off that week"
              />
            </Field>
            {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
              <Button
                type="submit"
                variant={dialog.mode === "decline" ? "danger" : "primary"}
                disabled={busyId === dialog.req.id}
              >
                {busyId === dialog.req.id ? "Saving…" : dialog.mode === "decline" ? "Decline request" : "Save decision"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}
