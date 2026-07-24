"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Handshake, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { globalSearch, type SearchHit } from "@/app/(app)/search-action";

const ICONS: Record<SearchHit["kind"], React.ReactNode> = {
  contact: <UserRound size={15} className="text-fg-3" />,
  practice: <Building2 size={15} className="text-fg-3" />,
  deal: <Handshake size={15} className="text-fg-3" />,
};

/** Inline search field that shows results in a dropdown beneath it — no modal. */
export function InlineSearch({
  variant = "bar",
  placeholder,
  hotkey = false,
  className,
}: {
  variant?: "bar" | "hero";
  placeholder?: string;
  /** Focus this field on Ctrl/Cmd+K. */
  hotkey?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Null until the platform is known on the client, so the server and first
  // client render agree (no badge) and we avoid a hydration mismatch.
  const [isMac, setIsMac] = React.useState<boolean | null>(null);

  const term = q.trim();

  React.useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || "";
    setIsMac(/mac/i.test(platform));
  }, []);

  React.useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (term.length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await globalSearch(term);
        setHits(r);
        setOpen(true);
        setActiveIdx(-1);
      } finally {
        setBusy(false);
      }
    }, 180);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [term]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  React.useEffect(() => {
    if (!hotkey) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey]);

  function go(hit: SearchHit) {
    setOpen(false);
    setQ("");
    setHits([]);
    inputRef.current?.blur();
    router.push(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0 && hits[activeIdx]) {
      e.preventDefault();
      go(hits[activeIdx]!);
    }
  }

  const isHero = variant === "hero";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div
        className={cn(
          "group flex items-center gap-2.5 border border-line transition-colors focus-within:border-fg-4 focus-within:bg-surface hover:border-fg-4/80",
          isHero
            ? "rounded-xl bg-surface/80 px-4 shadow-xs backdrop-blur"
            : "h-10 rounded-lg bg-surface-2 px-3.5",
        )}
      >
        <Search size={isHero ? 18 : 17} className="shrink-0 text-fg-3 transition-colors group-focus-within:text-fg-2" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => term.length >= 2 && hits.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? "Find anything…"}
          aria-label="Search"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-fg-1 placeholder:text-fg-3 focus:outline-none",
            isHero ? "py-3.5 text-[15px]" : "text-sm",
          )}
        />
        {hotkey && !q && isMac !== null ? (
          <kbd className="hidden shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-fg-4 sm:inline">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        ) : null}
      </div>

      {open && term.length >= 2 ? (
        <ul className="absolute inset-x-0 z-50 mt-1.5 max-h-96 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg">
          {busy && hits.length === 0 ? (
            <li className="px-3 py-3 text-sm text-fg-3">Searching…</li>
          ) : null}
          {!busy && hits.length === 0 ? (
            <li className="px-3 py-3 text-sm text-fg-3">No results for “{term}”.</li>
          ) : null}
          {hits.map((h, i) => (
            <li key={`${h.kind}-${h.id}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => go(h)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                  i === activeIdx ? "bg-surface-2" : "hover:bg-surface-2",
                )}
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
      ) : null}
    </div>
  );
}
