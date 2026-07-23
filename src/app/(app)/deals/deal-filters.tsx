"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select } from "@/components/ui/primitives";

export function DealFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");

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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q });
        }}
        className="w-72"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search practice, buyer, seller, ref…"
          aria-label="Search sales progression"
        />
      </form>
      <Select value={params.get("sort") ?? "activity"} onChange={(e) => apply({ sort: e.target.value })} className="w-52" aria-label="Sort deals">
        <option value="activity">Least recent activity first</option>
        <option value="target">Closest to completion</option>
        <option value="price">Highest price</option>
        <option value="oldest">Oldest deal</option>
      </Select>
      {params.size > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>Clear</Button>
      ) : null}
    </div>
  );
}
