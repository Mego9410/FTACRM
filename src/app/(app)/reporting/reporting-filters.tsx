"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/primitives";

export function ReportingFilters({
  owners,
  branches,
}: {
  owners: { id: string; full_name: string }[];
  branches: { id: string; name: string }[];
}) {
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
      <Select value={params.get("owner") ?? ""} onChange={(e) => apply({ owner: e.target.value })} className="w-44" aria-label="Filter by agent">
        <option value="">All agents</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>{o.full_name}</option>
        ))}
      </Select>
      <Select value={params.get("branch") ?? ""} onChange={(e) => apply({ branch: e.target.value })} className="w-44" aria-label="Filter by branch">
        <option value="">All branches</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </Select>
    </div>
  );
}
