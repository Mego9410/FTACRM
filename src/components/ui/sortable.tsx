"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "./primitives";

export type SortDir = "asc" | "desc";

/* ── Direction indicator ────────────────────────────────────────────── */

export function SortIndicator({ state }: { state: SortDir | null }) {
  if (state === "asc") return <ChevronUp size={13} className="shrink-0 text-gold-deep" />;
  if (state === "desc") return <ChevronDown size={13} className="shrink-0 text-gold-deep" />;
  return <ChevronsUpDown size={13} className="shrink-0 text-fg-4" />;
}

/* ── URL-driven header (server-paginated tables) ────────────────────────
 * Renders a <th> whose label is a link that toggles ?sort=&dir= in the URL,
 * so sorting spans every page of a paginated result, not just the rows on
 * screen. Safe to render from a server component.
 */

export function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  params,
  basePath = "",
  align = "left",
  className,
}: {
  label: string;
  sortKey: string;
  currentSort?: string;
  currentDir?: string;
  /** All current searchParams, so filters/tabs survive the sort link. */
  params: Record<string, string | undefined>;
  basePath?: string;
  align?: "left" | "right";
  className?: string;
}) {
  const active = currentSort === sortKey;
  const state: SortDir | null = active ? (currentDir === "desc" ? "desc" : "asc") : null;
  const nextDir = active && currentDir === "asc" ? "desc" : "asc";

  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "sort" && k !== "dir" && k !== "page") sp.set(k, v);
  }
  sp.set("sort", sortKey);
  sp.set("dir", nextDir);

  return (
    <th className={cn("px-3 py-2.5", align === "right" && "text-right", className)}>
      <Link
        href={`${basePath}?${sp.toString()}`}
        scroll={false}
        aria-sort={active ? (state === "asc" ? "ascending" : "descending") : "none"}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-fg-1",
          align === "right" && "flex-row-reverse",
          active && "text-fg-1",
        )}
      >
        {label}
        <SortIndicator state={state} />
      </Link>
    </th>
  );
}

/* ── Client in-memory sort (fully-loaded lists) ─────────────────────────
 * For lists/tables where every row is already on the page (record tabs,
 * admin editors). Accepts value accessors per sort key; nulls/blanks always
 * sort last regardless of direction.
 */

export type Accessor<T> = (row: T) => string | number | boolean | null | undefined;

function compare<T>(acc: Accessor<T>, a: T, b: T, dir: SortDir) {
  const av = acc(a);
  const bv = acc(b);
  const aEmpty = av === null || av === undefined || av === "";
  const bEmpty = bv === null || bv === undefined || bv === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // empties last
  if (bEmpty) return -1;
  const base =
    typeof av === "number" && typeof bv === "number"
      ? av - bv
      : typeof av === "boolean" && typeof bv === "boolean"
        ? Number(av) - Number(bv)
        : String(av).localeCompare(String(bv), "en-GB", { numeric: true, sensitivity: "base" });
  return dir === "asc" ? base : -base;
}

export function useClientSort<T>(
  rows: T[],
  accessors: Record<string, Accessor<T>>,
  initial?: { key: string; dir: SortDir },
) {
  const [key, setKey] = React.useState<string | null>(initial?.key ?? null);
  const [dir, setDir] = React.useState<SortDir>(initial?.dir ?? "asc");

  const toggle = React.useCallback((k: string) => {
    setKey((prev) => {
      if (prev === k) {
        setDir((d) => (d === "asc" ? "desc" : "asc"));
        return k;
      }
      setDir("asc");
      return k;
    });
  }, []);

  const set = React.useCallback((k: string, d: SortDir) => {
    setKey(k);
    setDir(d);
  }, []);

  const sorted = React.useMemo(() => {
    const acc = key ? accessors[key] : undefined;
    if (!acc) return rows;
    return [...rows].sort((a, b) => compare(acc, a, b, dir));
    // accessors is a stable literal per render site; key/dir/rows drive it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, key, dir]);

  const stateFor = (k: string): SortDir | null => (key === k ? dir : null);
  return { sorted, key, dir, toggle, set, stateFor };
}

/** Clickable <th> for a client table wired to useClientSort. */
export function SortTh({
  label,
  sortKey,
  state,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  sortKey: string;
  state: SortDir | null;
  onSort: (key: string) => void;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th className={cn("px-3 py-2.5", align === "right" && "text-right", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-sort={state ? (state === "asc" ? "ascending" : "descending") : "none"}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-fg-1",
          align === "right" && "flex-row-reverse",
          state && "text-fg-1",
        )}
      >
        {label}
        <SortIndicator state={state} />
      </button>
    </th>
  );
}

/** Dropdown + direction toggle for client card/list layouts with no header row. */
export function SortSelect({
  options,
  sortKey,
  dir,
  onChange,
  className,
}: {
  options: { key: string; label: string }[];
  sortKey: string | null;
  dir: SortDir;
  onChange: (key: string, dir: SortDir) => void;
  className?: string;
}) {
  const current = sortKey ?? options[0]?.key ?? "";
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-fg-4">Sort</span>
      <Select
        value={current}
        onChange={(e) => onChange(e.target.value, dir)}
        className="w-auto"
        aria-label="Sort by"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </Select>
      <button
        type="button"
        onClick={() => onChange(current, dir === "asc" ? "desc" : "asc")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg-1"
        aria-label={dir === "asc" ? "Ascending — click for descending" : "Descending — click for ascending"}
        title={dir === "asc" ? "Ascending" : "Descending"}
      >
        {dir === "asc" ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
      </button>
    </div>
  );
}
