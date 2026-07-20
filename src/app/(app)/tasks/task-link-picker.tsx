"use client";

import * as React from "react";
import { Building2, Handshake, UserRound, X } from "lucide-react";
import { Input, Select } from "@/components/ui/primitives";
import { searchTaskLinks, type LinkColumn, type LinkHit, type LinkType } from "./link-search";

export type TaskLink = { type: LinkType; column: LinkColumn; id: string; title: string };

const TYPE_OPTIONS: { value: LinkType; label: string }[] = [
  { value: "practice", label: "Practice" },
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "solicitor", label: "Solicitor" },
  { value: "deal", label: "Deal" },
];

export const LINK_ICON: Record<LinkType, React.ReactNode> = {
  practice: <Building2 size={14} />,
  buyer: <UserRound size={14} />,
  seller: <UserRound size={14} />,
  solicitor: <UserRound size={14} />,
  deal: <Handshake size={14} />,
};

export function TaskLinkPicker({
  value,
  onChange,
}: {
  value: TaskLink | null;
  onChange: (v: TaskLink | null) => void;
}) {
  const [type, setType] = React.useState<LinkType>(value?.type ?? "practice");
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<LinkHit[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        setHits(await searchTaskLinks(type, q.trim()));
        setOpen(true);
      } finally {
        setBusy(false);
      }
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, type]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-sm border border-line bg-surface-2 px-3 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-gold-deep">{LINK_ICON[value.type]}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-fg-1">{value.title}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-4">{value.type}</span>
          </span>
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded p-1 text-fg-4 hover:text-danger"
          aria-label="Remove link"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select
        value={type}
        onChange={(e) => {
          setType(e.target.value as LinkType);
          setQ("");
          setHits([]);
        }}
        className="w-32 shrink-0"
        aria-label="Link type"
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <div className="relative flex-1">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={type === "deal" ? "Search deals by ref…" : `Search ${type}s…`}
        />
        {open && (busy || hits.length > 0) ? (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-sm border border-line bg-surface shadow-md">
            {busy && hits.length === 0 ? <li className="px-3 py-2 text-sm text-fg-3">Searching…</li> : null}
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-2"
                  onClick={() => {
                    onChange({ type: h.type, column: h.column, id: h.id, title: h.title });
                    setOpen(false);
                    setQ("");
                    setHits([]);
                  }}
                >
                  <span className="text-fg-3">{LINK_ICON[h.type]}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-fg-1">{h.title}</span>
                    {h.subtitle ? <span className="block truncate text-xs text-fg-3">{h.subtitle}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
