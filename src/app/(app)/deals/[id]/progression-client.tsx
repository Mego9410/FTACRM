"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2 } from "lucide-react";
import type { LookupValue } from "@/lib/lookups";
import { Pencil } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { SlideOver } from "@/components/ui/slide-over";
import { cn, daysSince, formatDate } from "@/lib/utils";
import { markStage, setDealStatus, unmarkStage, updateDealFields } from "../actions";

type Stage = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_terminal: boolean;
  achieved_on: string | null;
  note: string | null;
  recorded_by: string | null;
};

type Deal = {
  id: string;
  status: string;
  target_completion_date: string | null;
  created_at: string;
  last_activity_at: string;
};

export function ProgressionClient({
  deal,
  stages,
  fallThroughReasons,
}: {
  deal: Deal;
  stages: Stage[];
  fallThroughReasons: LookupValue[];
}) {
  const router = useRouter();
  const [marking, setMarking] = React.useState<Stage | null>(null);
  const [fallOpen, setFallOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const firstUnachieved = stages.find((s) => !s.achieved_on);
  const live = deal.status === "in_progress";
  const daysRunning = daysSince(deal.created_at) ?? 0;
  const idleDays = daysSince(deal.last_activity_at) ?? 0;

  async function submitMark(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!marking) return;
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await markStage({
      deal_id: deal.id,
      stage_id: marking.id,
      achieved_on: String(f.get("achieved_on")),
      note: String(f.get("note") ?? "") || null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setMarking(null);
    router.refresh();
  }

  async function submitFallThrough(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await setDealStatus({
      deal_id: deal.id,
      status: "fallen_through",
      fall_through_reason_id: String(f.get("reason_id") ?? "") || null,
      note: String(f.get("note") ?? "") || null,
      relist: f.get("relist") === "on",
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setFallOpen(false);
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader title="Stage tracker" />
        <ol className="divide-y divide-line">
          {stages.map((s) => {
            const isCurrent = live && firstUnachieved?.id === s.id;
            return (
              <li key={s.id} className={cn("flex items-center gap-4 px-5 py-3.5", isCurrent && "bg-gold-tint/40")}>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    s.achieved_on
                      ? "bg-available-fg text-white"
                      : isCurrent
                        ? "animate-pulse bg-gold text-ink"
                        : "bg-surface-3 text-fg-4",
                  )}
                >
                  {s.achieved_on ? <Check size={15} /> : s.sort_order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-bold", s.achieved_on ? "text-fg-1" : isCurrent ? "text-gold-deep" : "text-fg-3")}>
                    {s.label}
                  </p>
                  {s.achieved_on ? (
                    <p className="text-xs text-fg-3">
                      {formatDate(s.achieved_on)}
                      {s.recorded_by ? ` · ${s.recorded_by}` : ""}
                      {s.note ? ` · ${s.note}` : ""}
                    </p>
                  ) : isCurrent ? (
                    <p className="text-xs text-gold-deep">Current stage</p>
                  ) : null}
                </div>
                {live || deal.status === "on_hold" ? (
                  s.achieved_on ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!window.confirm(`Un-mark “${s.label}”? Its date will be removed.`)) return;
                        const res = await unmarkStage({ deal_id: deal.id, stage_id: s.id });
                        if (!res.ok) window.alert(res.error);
                        router.refresh();
                      }}
                    >
                      <Undo2 size={13} /> Undo
                    </Button>
                  ) : (
                    <Button variant={isCurrent ? "primary" : "outline"} size="sm" onClick={() => setMarking(s)}>
                      Mark done
                    </Button>
                  )
                ) : null}
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader title="Key facts" />
          <dl className="space-y-2 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-3">Days in progress</dt>
              <dd className="font-semibold text-fg-1">{daysRunning}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-3">Days since activity</dt>
              <dd className={cn("font-semibold", idleDays >= 14 ? "text-danger" : "text-fg-1")}>{idleDays}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Deal settings"
            action={
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="gap-1.5">
                <Pencil size={13} /> Edit
              </Button>
            }
          />
          <dl className="space-y-3 px-5 py-4 text-sm">
            <div>
              <dt className="text-xs font-semibold tracking-wide text-fg-3">Target completion</dt>
              <dd className="mt-0.5 font-medium text-fg-1">
                {deal.target_completion_date ? formatDate(deal.target_completion_date) : "Not set"}
              </dd>
            </div>
          </dl>
        </Card>

        {deal.status !== "completed" ? (
          <Card>
            <CardHeader title="Deal status" />
            <div className="space-y-2 px-5 py-4">
              {live ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    await setDealStatus({ deal_id: deal.id, status: "on_hold" });
                    router.refresh();
                  }}
                >
                  Put on hold
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    await setDealStatus({ deal_id: deal.id, status: "in_progress" });
                    router.refresh();
                  }}
                >
                  Resume deal
                </Button>
              )}
              {deal.status !== "fallen_through" ? (
                <Button variant="danger" size="sm" className="w-full" onClick={() => setFallOpen(true)}>
                  Record fall-through
                </Button>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>

      <SlideOver open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Edit deal settings">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const f = new FormData(e.currentTarget);
            await updateDealFields({
              deal_id: deal.id,
              target_completion_date: String(f.get("target") ?? "") || null,
              buyer_solicitor_id: null,
              seller_solicitor_id: null,
            });
            setBusy(false);
            setSettingsOpen(false);
            router.refresh();
          }}
        >
          <Field label="Target completion" htmlFor="dp_target">
            <Input id="dp_target" name="target" type="date" defaultValue={deal.target_completion_date ?? ""} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </SlideOver>

      <Dialog open={!!marking} onClose={() => setMarking(null)} title={`Mark “${marking?.label}” done`}>
        <form onSubmit={submitMark} className="space-y-4">
          <Field label="Date achieved" htmlFor="ms_date">
            <Input id="ms_date" name="achieved_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </Field>
          <Field label="Note" htmlFor="ms_note">
            <Textarea id="ms_note" name="note" rows={2} placeholder="Anything worth recording…" />
          </Field>
          {marking?.is_terminal ? (
            <p className="rounded-sm bg-gold-tint px-3 py-2 text-sm font-semibold text-gold-deep">
              Marking completion closes the deal and moves the practice to Completed.
            </p>
          ) : null}
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setMarking(null)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Mark done"}</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={fallOpen} onClose={() => setFallOpen(false)} title="Record fall-through">
        <form onSubmit={submitFallThrough} className="space-y-4">
          <Field label="Reason" htmlFor="ft_reason">
            <Select id="ft_reason" name="reason_id" required defaultValue="">
              <option value="">Choose…</option>
              {fallThroughReasons.map((r) => (
                <option key={r.id} value={r.id}>{r.value}</option>
              ))}
            </Select>
          </Field>
          <Field label="Note" htmlFor="ft_note">
            <Textarea id="ft_note" name="note" rows={2} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-fg-1">
            <input type="checkbox" name="relist" defaultChecked className="h-4 w-4 accent-[#E4AD25]" />
            Relist the practice as available immediately
          </label>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setFallOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={busy}>
              {busy ? "Recording…" : "Record fall-through"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
