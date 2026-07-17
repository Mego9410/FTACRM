"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { globalSearch, type SearchHit } from "@/app/(app)/search-action";
import { Input } from "@/components/ui/primitives";

export function MatchPicker({
  current,
}: {
  current: { kind: "practice" | "buyer"; id: string; label: string } | null;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const results = await globalSearch(q.trim());
      setHits(results.filter((r) => r.kind !== "deal"));
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  if (current) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-3">
        {current.kind === "practice" ? <Building2 size={16} className="text-gold-deep" /> : <UserRound size={16} className="text-gold-deep" />}
        <span className="font-semibold text-fg-1">{current.label}</span>
        <Badge tone="gold" className="capitalize">{current.kind === "practice" ? "Finding buyers" : "Finding practices"}</Badge>
        <button
          type="button"
          onClick={() => router.push("/matching")}
          className="ml-auto rounded p-1.5 text-fg-3 hover:bg-surface-3 hover:text-fg-1"
          aria-label="Clear selection"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative max-w-xl">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a practice or a buyer…"
        aria-label="Pick a practice or buyer to match"
      />
      {hits.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-md">
          {hits.map((h) => (
            <li key={`${h.kind}-${h.id}`}>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2"
                onClick={() => {
                  setQ("");
                  setHits([]);
                  router.push(`/matching?${h.kind === "practice" ? "practice" : "buyer"}=${h.id}`);
                }}
              >
                {h.kind === "practice" ? <Building2 size={15} className="text-fg-3" /> : <UserRound size={15} className="text-fg-3" />}
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
  );
}
