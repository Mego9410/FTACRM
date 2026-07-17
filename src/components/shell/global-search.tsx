"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Handshake, Search, UserRound } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { globalSearch, type SearchHit } from "@/app/(app)/search-action";

const ICONS: Record<SearchHit["kind"], React.ReactNode> = {
  contact: <UserRound size={15} className="text-fg-3" />,
  practice: <Building2 size={15} className="text-fg-3" />,
  deal: <Handshake size={15} className="text-fg-3" />,
};

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [busy, setBusy] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!open) {
      setQ("");
      setHits([]);
    }
  }, [open]);

  React.useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        setHits(await globalSearch(q.trim()));
      } finally {
        setBusy(false);
      }
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  return (
    <Dialog open={open} onClose={onClose} title="Search" wide>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search contacts, practices, deals — name, email, ref, postcode…"
          className="h-11 w-full rounded-sm border border-line bg-surface pl-9 pr-3 text-[15px] text-fg-1 placeholder:text-fg-4 focus-visible:border-gold"
        />
      </div>
      <div className="mt-3 max-h-96 overflow-y-auto">
        {busy && hits.length === 0 ? <p className="px-2 py-6 text-center text-sm text-fg-3">Searching…</p> : null}
        {!busy && q.trim().length >= 2 && hits.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-fg-3">No results for “{q.trim()}”.</p>
        ) : null}
        <ul>
          {hits.map((h) => (
            <li key={`${h.kind}-${h.id}`}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-left hover:bg-surface-2"
                onClick={() => {
                  onClose();
                  router.push(h.href);
                }}
              >
                {ICONS[h.kind]}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg-1">{h.title}</span>
                  {h.subtitle ? <span className="block truncate text-xs text-fg-3">{h.subtitle}</span> : null}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-fg-4">{h.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
