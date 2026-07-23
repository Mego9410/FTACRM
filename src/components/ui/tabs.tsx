"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type TabDef = { label: string; href: string; count?: number | null; exact?: boolean };

/** Link-based tab strip with a gold active underline (record pages, list segments). */
export function LinkTabs({ tabs, className }: { tabs: TabDef[]; className?: string }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const current = `${pathname}${search.size ? `?${search.toString()}` : ""}`;

  const isActive = (t: TabDef) => {
    if (t.href.includes("?")) return current === t.href || current.startsWith(`${t.href}&`);
    if (t.exact) return pathname === t.href && search.size === 0;
    return pathname === t.href || pathname.startsWith(`${t.href}/`);
  };

  return (
    <nav className={cn("flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line", className)}>
      {tabs.map((t) => {
        const active = isActive(t);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "border-gold text-fg-1"
                : "border-transparent text-fg-3 hover:border-line hover:text-fg-1",
            )}
          >
            {t.label}
            {t.count !== undefined && t.count !== null ? (
              <span
                className={cn(
                  "ml-1.5 text-sm font-bold",
                  active ? "text-gold-deep" : "text-fg-4",
                )}
              >
                {t.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
