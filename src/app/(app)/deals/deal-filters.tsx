"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Select } from "@/components/ui/primitives";

export function DealFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function apply(extra: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(extra)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={params.get("sort") ?? "activity"} onChange={(e) => apply({ sort: e.target.value })} className="w-52" aria-label="Sort deals">
        <option value="activity">Least recent activity first</option>
        <option value="target">Closest to completion</option>
        <option value="price">Highest price</option>
        <option value="oldest">Oldest deal</option>
      </Select>
      <label className="flex items-center gap-2 text-sm font-semibold text-fg-1">
        <input
          type="checkbox"
          checked={params.get("stalled") === "1"}
          onChange={(e) => apply({ stalled: e.target.checked ? "1" : "" })}
          className="h-4 w-4 accent-[#E4AD25]"
        />
        Stalled only
      </label>
      {params.size > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>Clear</Button>
      ) : null}
    </div>
  );
}
