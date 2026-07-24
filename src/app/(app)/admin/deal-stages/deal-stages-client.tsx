"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { addDealStage, updateDealStage, moveDealStage, deleteDealStage } from "./actions";

type Stage = { id: string; label: string; sort_order: number; is_terminal: boolean; is_active: boolean };

export function DealStagesClient({ stages }: { stages: Stage[] }) {
  const router = useRouter();
  const toast = useToast();
  const [newLabel, setNewLabel] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function run(p: Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    const res = await p;
    if (!res.ok) return toast.error(res.error ?? "Something went wrong.");
    if (okMsg) toast.success(okMsg);
    router.refresh();
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setBusy(true);
    const res = await addDealStage({ label: newLabel.trim() });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setNewLabel("");
    toast.success("Stage added.");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-fg-1">Deal stages</h2>
        <p className="text-sm text-fg-3">
          The standard progression template for every new deal. Individual deals can add their own extra stages on the deal itself.
        </p>
      </div>
      <Card>
        <CardHeader title={`Stages (${stages.length})`} />
        <ul className="divide-y divide-line">
          {stages.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-fg-3">{i + 1}</span>
              <input
                defaultValue={s.label}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== s.label) {
                    void run(updateDealStage({ id: s.id, label: e.target.value.trim(), is_terminal: s.is_terminal, is_active: s.is_active }), "Stage renamed.");
                  }
                }}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-fg-1 hover:border-line focus:border-gold focus:outline-none"
              />
              {s.is_terminal ? <Badge tone="green">Terminal</Badge> : null}
              {!s.is_active ? <Badge>Inactive</Badge> : null}
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => void run(moveDealStage({ id: s.id, dir: "up" }))} disabled={i === 0} className="rounded p-1 text-fg-4 hover:bg-surface-3 hover:text-fg-1 disabled:opacity-30" aria-label="Move up"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => void run(moveDealStage({ id: s.id, dir: "down" }))} disabled={i === stages.length - 1} className="rounded p-1 text-fg-4 hover:bg-surface-3 hover:text-fg-1 disabled:opacity-30" aria-label="Move down"><ArrowDown size={14} /></button>
                <label className="ml-1 flex items-center gap-1 text-xs text-fg-3" title="Terminal stage (completes the deal)">
                  <input type="checkbox" defaultChecked={s.is_terminal} onChange={(e) => void run(updateDealStage({ id: s.id, label: s.label, is_terminal: e.target.checked, is_active: s.is_active }), "Updated.")} className="h-3.5 w-3.5 accent-[#E4AD25]" />
                  End
                </label>
                <label className="ml-1 flex items-center gap-1 text-xs text-fg-3" title="Active — shown on new deals">
                  <input type="checkbox" defaultChecked={s.is_active} onChange={(e) => void run(updateDealStage({ id: s.id, label: s.label, is_terminal: s.is_terminal, is_active: e.target.checked }), "Updated.")} className="h-3.5 w-3.5 accent-[#E4AD25]" />
                  Active
                </label>
                <button type="button" onClick={() => { if (window.confirm(`Delete the "${s.label}" stage?`)) void run(deleteDealStage({ id: s.id }), "Stage deleted."); }} className="ml-1 rounded p-1 text-fg-4 hover:bg-surface-3 hover:text-danger" aria-label="Delete stage"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
        <form onSubmit={add} className="flex items-end gap-2 border-t border-line p-4">
          <Field label="Add a stage" htmlFor="new_stage" className="flex-1">
            <Input id="new_stage" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Survey booked" />
          </Field>
          <Button type="submit" disabled={busy || !newLabel.trim()} className="gap-1"><Plus size={15} /> Add</Button>
        </form>
      </Card>
    </div>
  );
}
