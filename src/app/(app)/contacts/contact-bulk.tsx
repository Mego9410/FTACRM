"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, Archive, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { exportContactsByIds, bulkArchiveContacts } from "./csv-actions";

type Sel = {
  selected: Set<string>;
  toggle: (id: string) => void;
  setMany: (ids: string[], on: boolean) => void;
  clear: () => void;
};
const Ctx = React.createContext<Sel | null>(null);

export function ContactSelection({ children }: { children: React.ReactNode }) {
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

function useSel(): Sel {
  const c = React.useContext(Ctx);
  return c ?? { selected: new Set(), toggle: () => {}, setMany: () => {}, clear: () => {} };
}

const box = "h-4 w-4 shrink-0 accent-[#E4AD25] cursor-pointer";

export function RowCheck({ id }: { id: string }) {
  const { selected, toggle } = useSel();
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
  const { selected, setMany } = useSel();
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

export function BulkBar() {
  const { selected, clear } = useSel();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const ids = React.useMemo(() => [...selected], [selected]);
  if (ids.length === 0) return null;

  async function exportSel() {
    setBusy(true);
    const res = await exportContactsByIds({ ids });
    setBusy(false);
    if (!res.ok || !res.data) return toast.error(res.ok ? "Nothing to export." : res.error);
    const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.data.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${ids.length} contacts.`);
  }

  async function archiveSel() {
    if (!window.confirm(`Archive ${ids.length} contact${ids.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    const res = await bulkArchiveContacts({ ids });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Archived ${ids.length} contacts.`);
    clear();
    router.refresh();
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-lg">
        <span className="pl-1 text-sm font-semibold text-fg-1">{ids.length} selected</span>
        <button type="button" onClick={() => void exportSel()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-fg-2 hover:bg-surface-2">
          <Download size={14} /> Export
        </button>
        <button type="button" onClick={() => void archiveSel()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-fg-2 hover:bg-surface-2">
          <Archive size={14} /> Archive
        </button>
        <button type="button" onClick={clear} className="rounded-lg p-1.5 text-fg-4 hover:bg-surface-2 hover:text-fg-1" aria-label="Clear selection">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
