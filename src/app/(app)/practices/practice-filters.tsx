"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select } from "@/components/ui/primitives";

export function PracticeFilters({ owners }: { owners: { id: string; full_name: string }[] }) {
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
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, town, postcode, ref…" aria-label="Search practices" />
      </form>
      <Select value={params.get("owner") ?? ""} onChange={(e) => apply({ owner: e.target.value })} className="w-44" aria-label="Filter by owner">
        <option value="">Any owner</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>{o.full_name}</option>
        ))}
      </Select>
      <Input
        className="w-32"
        placeholder="Min £"
        inputMode="numeric"
        defaultValue={params.get("min") ?? ""}
        onBlur={(e) => apply({ min: e.target.value.replace(/\D/g, "") })}
        aria-label="Minimum price"
      />
      <Input
        className="w-32"
        placeholder="Max £"
        inputMode="numeric"
        defaultValue={params.get("max") ?? ""}
        onBlur={(e) => apply({ max: e.target.value.replace(/\D/g, "") })}
        aria-label="Maximum price"
      />
      {params.size > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>Clear</Button>
      ) : null}
    </div>
  );
}
