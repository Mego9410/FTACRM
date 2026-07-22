"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/primitives";

export function ReportingFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function apply(extra: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(extra)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={params.get("period") ?? "month"} onChange={(e) => apply({ period: e.target.value })} className="w-56" aria-label="Comparison period">
        <option value="month">This month vs last</option>
        <option value="quarter">This quarter vs last</option>
        <option value="year">Year to date vs prior</option>
      </Select>
    </div>
  );
}
