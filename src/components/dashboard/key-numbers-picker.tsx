"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/primitives";
import {
  DEFAULT_KEY_NUMBERS,
  MAX_KEY_NUMBERS,
  METRICS,
  METRIC_BY_ID,
  type MetricId,
} from "@/lib/dashboard-metrics";

/**
 * Pick up to six key numbers for the dashboard strip and set their order.
 * Selected list is reorderable (up/down); available list adds until the cap.
 */
export function KeyNumbersPicker({
  open,
  value,
  onClose,
  onSave,
}: {
  open: boolean;
  value: MetricId[];
  onClose: () => void;
  onSave: (next: MetricId[]) => void;
}) {
  const [selected, setSelected] = React.useState<MetricId[]>(value);
  React.useEffect(() => {
    if (open) setSelected(value.length ? value : DEFAULT_KEY_NUMBERS);
  }, [open, value]);

  const available = METRICS.filter((m) => !selected.includes(m.id));
  const atCap = selected.length >= MAX_KEY_NUMBERS;

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= selected.length) return;
    const next = [...selected];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setSelected(next);
  };
  const remove = (id: MetricId) => setSelected((s) => s.filter((x) => x !== id));
  const add = (id: MetricId) => setSelected((s) => (s.length >= MAX_KEY_NUMBERS ? s : [...s, id]));

  return (
    <Dialog open={open} onClose={onClose} title="Choose your key numbers">
      <p className="text-sm text-fg-2">
        Pick up to {MAX_KEY_NUMBERS} and drag the arrows to set their order.
      </p>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-fg-3">
          Showing · {selected.length}/{MAX_KEY_NUMBERS}
        </p>
        <ul className="space-y-1.5">
          {selected.map((id, i) => (
            <li key={id} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-[12px] font-extrabold text-ink">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg-1">{METRIC_BY_ID[id].label}</span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-fg-4 hover:text-fg-1 disabled:opacity-30" title="Move up">
                <ArrowUp size={15} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="rounded p-1 text-fg-4 hover:text-fg-1 disabled:opacity-30" title="Move down">
                <ArrowDown size={15} />
              </button>
              <button type="button" onClick={() => remove(id)} className="rounded p-1 text-fg-4 hover:text-danger" title="Remove">
                <X size={15} />
              </button>
            </li>
          ))}
          {selected.length === 0 ? <li className="text-sm text-fg-3">Nothing selected — add some below.</li> : null}
        </ul>
      </div>

      {available.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-fg-3">Available</p>
          <div className="flex flex-wrap gap-1.5">
            {available.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => add(m.id)}
                disabled={atCap}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-fg-2 hover:border-gold hover:text-fg-1 disabled:cursor-not-allowed disabled:opacity-40"
                title={atCap ? `Remove one first (max ${MAX_KEY_NUMBERS})` : `Add ${m.label}`}
              >
                <Plus size={13} /> {m.label}
              </button>
            ))}
          </div>
          {atCap ? <p className="mt-2 text-xs text-fg-3">You've reached the maximum of {MAX_KEY_NUMBERS}. Remove one to add another.</p> : null}
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="button" onClick={() => onSave(selected)} disabled={selected.length === 0}>
          Save
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
