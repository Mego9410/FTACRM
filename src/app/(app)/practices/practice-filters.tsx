"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select } from "@/components/ui/primitives";

export function PracticeFilters() {
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
      <Select value={params.get("sort") ?? "recent"} onChange={(e) => apply({ sort: e.target.value })} className="w-44" aria-label="Sort practices">
        <option value="recent">Date added</option>
        <option value="title">Title</option>
        <option value="price">Price</option>
        <option value="town">Town</option>
        <option value="surgeries">Surgeries</option>
        <option value="status">Status</option>
      </Select>
      <Select value={params.get("dir") ?? "desc"} onChange={(e) => apply({ dir: e.target.value })} className="w-36" aria-label="Sort direction">
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </Select>
      {!params.get("status") ? (
        <label className="flex items-center gap-1.5 text-sm text-fg-2" title="Withdrawn and completed practices stay on the database but are hidden here by default">
          <input
            type="checkbox"
            checked={params.get("offmarket") !== "1"}
            onChange={(e) => apply({ offmarket: e.target.checked ? "" : "1" })}
            className="h-4 w-4 accent-[#E4AD25]"
          />
          Hide off-market
        </label>
      ) : null}
      {params.size > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>Clear</Button>
      ) : null}
    </div>
  );
}
