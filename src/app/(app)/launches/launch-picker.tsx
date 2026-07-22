"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Rocket, Search } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Practice = { id: string; ref: string; display_title: string; town: string | null; status: string };

const STATUS_LABEL: Record<string, string> = { preparing: "Preparing", available: "Available" };

export function LaunchPicker({ practices }: { practices: Practice[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const matches = (
    q
      ? practices.filter(
          (p) =>
            p.display_title.toLowerCase().includes(q) ||
            p.ref.toLowerCase().includes(q) ||
            (p.town ?? "").toLowerCase().includes(q),
        )
      : practices
  ).slice(0, 8);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(p: Practice) {
    router.push(`/launches/new?practice=${p.id}`);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 p-5">
        <Rocket size={20} className="shrink-0 text-gold-deep" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-fg-1">Start a launch</p>
          <p className="text-xs text-fg-3">Search a preparing or available practice to launch to its matched buyers</p>
        </div>
        <div ref={boxRef} className="relative w-full sm:ml-auto sm:w-96">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((a) => Math.min(a + 1, matches.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && matches[active]) {
                e.preventDefault();
                choose(matches[active]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Search by name, ref or town…"
            className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-fg-1 outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            aria-label="Search a practice to launch"
          />
          {open ? (
            <ul className="absolute inset-x-0 z-50 mt-1.5 max-h-80 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg">
              {matches.length === 0 ? (
                <li className="px-3 py-3 text-sm text-fg-3">No launchable practices match.</li>
              ) : (
                matches.map((p, i) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(p)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left",
                        i === active ? "bg-gold-tint" : "hover:bg-surface-2",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-fg-1">{p.display_title}</span>
                        <span className="block truncate text-xs text-fg-3">
                          {p.ref}{p.town ? ` · ${p.town}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-fg-3">
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
