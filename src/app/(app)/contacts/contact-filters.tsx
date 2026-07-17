"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input, Select, Button } from "@/components/ui/primitives";

export function ContactFilters({ owners }: { owners: { id: string; full_name: string }[] }) {
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
          placeholder="Search name, email, phone, ref…"
          aria-label="Search contacts"
        />
      </form>
      <Select
        value={params.get("owner") ?? ""}
        onChange={(e) => apply({ owner: e.target.value })}
        className="w-44"
        aria-label="Filter by owner"
      >
        <option value="">Any owner</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>{o.full_name}</option>
        ))}
      </Select>
      <Select
        value={params.get("temperature") ?? ""}
        onChange={(e) => apply({ temperature: e.target.value })}
        className="w-36"
        aria-label="Filter by temperature"
      >
        <option value="">Any temp</option>
        <option value="hot">Hot</option>
        <option value="warm">Warm</option>
        <option value="cold">Cold</option>
      </Select>
      <Select
        value={params.get("stale") ?? ""}
        onChange={(e) => apply({ stale: e.target.value })}
        className="w-52"
        aria-label="Filter by last contacted"
      >
        <option value="">Any last contact</option>
        <option value="30">Not contacted 30 days</option>
        <option value="90">Not contacted 90 days</option>
        <option value="180">Not contacted 180 days</option>
      </Select>
      {params.size > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
