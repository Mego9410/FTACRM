"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/primitives";

export function EmailPeriodFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function apply(period: string) {
    const sp = new URLSearchParams(params.toString());
    if (period) sp.set("period", period);
    else sp.delete("period");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <Select
      value={params.get("period") ?? "month"}
      onChange={(e) => apply(e.target.value)}
      className="w-56"
      aria-label="Comparison period"
    >
      <option value="month">This month vs last</option>
      <option value="quarter">This quarter vs last</option>
      <option value="year">Year to date vs prior</option>
    </Select>
  );
}
