"use client";

import * as React from "react";
import { X } from "lucide-react";

type Sel = {
  selected: Set<string>;
  toggle: (id: string) => void;
  setMany: (ids: string[], on: boolean) => void;
  clear: () => void;
};
const Ctx = React.createContext<Sel | null>(null);

/** Generic multi-select provider for list pages. Wrap the list + <BulkBar>. */
export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const toggle = React.useCallback((id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);
  const setMany = React.useCallback((ids: string[], on: boolean) => {
    setSelected((s) => {
      const n = new Set(s);
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
      return n;
    });
  }, []);
  const clear = React.useCallback(() => setSelected(new Set()), []);
  const value = React.useMemo(() => ({ selected, toggle, setMany, clear }), [selected, toggle, setMany, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelection(): Sel {
  return React.useContext(Ctx) ?? { selected: new Set(), toggle: () => {}, setMany: () => {}, clear: () => {} };
}

const box = "h-4 w-4 shrink-0 accent-[#E4AD25] cursor-pointer";

export function RowCheck({ id }: { id: string }) {
  const { selected, toggle } = useSelection();
  return (
    <input
      type="checkbox"
      className={box}
      checked={selected.has(id)}
      onChange={() => toggle(id)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Select row"
    />
  );
}

export function SelectAll({ ids }: { ids: string[] }) {
  const { selected, setMany } = useSelection();
  const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
  return (
    <input
      type="checkbox"
      className={box}
      checked={allOn}
      onChange={(e) => setMany(ids, e.target.checked)}
      aria-label="Select all"
    />
  );
}

export type BulkAction = {
  label: string;
  icon?: React.ReactNode;
  run: (ids: string[]) => Promise<void> | void;
  danger?: boolean;
};

/** Floating bar shown while any rows are selected. Actions are provided by the page. */
export function BulkBar({ noun, actions }: { noun: string; actions: BulkAction[] }) {
  const { selected, clear } = useSelection();
  const [busy, setBusy] = React.useState(false);
  const ids = React.useMemo(() => [...selected], [selected]);
  if (ids.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-lg">
        <span className="pl-1 text-sm font-semibold text-fg-1">
          {ids.length} {noun}
          {ids.length === 1 ? "" : "s"} selected
        </span>
        {actions.map((a, i) => (
          <button
            key={i}
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await a.run(ids);
              } finally {
                setBusy(false);
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-surface-2 ${a.danger ? "text-fg-2 hover:text-danger" : "text-fg-2"}`}
          >
            {a.icon} {a.label}
          </button>
        ))}
        <button type="button" onClick={clear} className="rounded-lg p-1.5 text-fg-4 hover:bg-surface-2 hover:text-fg-1" aria-label="Clear selection">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

/** Trigger a browser download of CSV text. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
