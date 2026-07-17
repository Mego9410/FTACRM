"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/primitives";
import { searchContacts } from "@/app/(app)/contacts/[id]/related/actions";

export type PickedContact = { id: string; label: string; sub: string | null };

/** Debounced contact search box with a result dropdown. */
export function ContactPicker({
  onPick,
  placeholder = "Search contacts…",
  autoFocus,
}: {
  onPick: (c: PickedContact) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<PickedContact[]>([]);
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setHits(await searchContacts(q.trim()));
      setOpen(true);
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
      <Input
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="pl-9"
      />
      {open && hits.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-md">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-surface-2"
                onClick={() => {
                  onPick(h);
                  setQ("");
                  setHits([]);
                  setOpen(false);
                }}
              >
                <span className="block text-sm font-semibold text-fg-1">{h.label}</span>
                {h.sub ? <span className="block text-xs text-fg-3">{h.sub}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
