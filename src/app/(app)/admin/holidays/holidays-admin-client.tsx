"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { HOLIDAY_LABEL, HOLIDAY_TONE, workingDays } from "@/lib/holiday-utils";
import type { HolidayRequest } from "@/lib/holidays";
import { decideHolidayRequest } from "@/lib/actions/holidays";

function dateRange(r: HolidayRequest) {
  return r.start_date === r.end_date
    ? formatDate(r.start_date)
    : `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`;
}

export function HolidaysAdminClient({
  pending,
  decided,
}: {
  pending: HolidayRequest[];
  decided: HolidayRequest[];
}) {
  const router = useRouter();
  const [declining, setDeclining] = React.useState<HolidayRequest | null>(null);
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

  async function submitDecline(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!declining) return;
    setBusyId(declining.id);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await decideHolidayRequest({
      id: declining.id,
      decision: "rejected",
      note: String(f.get("note") ?? "") || null,
    });
    setBusyId(null);
    if (!res.ok) return setError(res.error);
    setDeclining(null);
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
                      <span className="text-fg-3">
                        {" · "}
                        {workingDays(r.start_date, r.end_date)} working day
                        {workingDays(r.start_date, r.end_date) === 1 ? "" : "s"}
                      </span>
                    </p>
                    {r.reason ? <p className="mt-1 text-xs text-fg-3">{r.reason}</p> : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDeclining(r)} disabled={busyId === r.id}>
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
        {error ? <p className="px-5 pb-3 text-sm font-medium text-danger">{error}</p> : null}
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
                <span className="text-xs text-fg-4">
                  {r.decider_name ? `${r.decider_name}` : ""}
                  {r.decided_at ? ` · ${formatDate(r.decided_at)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={!!declining} onClose={() => setDeclining(null)} title="Decline holiday request">
        {declining ? (
          <form onSubmit={submitDecline} className="space-y-4">
            <p className="text-sm text-fg-2">
              {declining.requester_name} — {dateRange(declining)}
            </p>
            <Field label="Reason (optional)" htmlFor="decline_note" hint="Shown to the requester so they know why">
              <Textarea id="decline_note" name="note" rows={3} placeholder="e.g. Too many people off that week" />
            </Field>
            {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDeclining(null)}>Cancel</Button>
              <Button type="submit" variant="danger" disabled={busyId === declining.id}>
                {busyId === declining.id ? "Saving…" : "Decline request"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}
