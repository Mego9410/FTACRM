"use client";

import { InlineSearch } from "@/components/shell/inline-search";

/** The big front-and-centre search on the dashboard hero — inline results, no modal. */
export function DashboardSearch() {
  return <InlineSearch variant="hero" placeholder="Search contacts, practices, deals…" />;
}
