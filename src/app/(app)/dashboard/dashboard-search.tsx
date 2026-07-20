"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { GlobalSearch } from "@/components/shell/global-search";

/** The big front-and-centre search on the dashboard hero. Opens the command palette. */
export function DashboardSearch() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface/80 px-4 py-3.5 text-left shadow-xs backdrop-blur transition-colors hover:border-gold/60 hover:bg-surface"
      >
        <Search size={18} className="shrink-0 text-fg-3 transition-colors group-hover:text-gold-deep" />
        <span className="flex-1 truncate text-[15px] text-fg-3">Search contacts, practices, deals…</span>
        <kbd className="hidden shrink-0 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-fg-4 sm:inline">
          ⌘K
        </kbd>
      </button>
      <GlobalSearch open={open} onClose={() => setOpen(false)} />
    </>
  );
}
