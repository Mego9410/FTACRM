"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Select } from "@/components/ui/primitives";

export function ActivityFilters({ team }: { team: { id: string; full_name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function apply(extra: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(extra)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("before");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={params.get("author") ?? ""} onChange={(e) => apply({ author: e.target.value })} className="w-48" aria-label="Filter by team member">
        <option value="">Everyone</option>
        {team.map((t) => (
          <option key={t.id} value={t.id}>{t.full_name}</option>
        ))}
      </Select>
      <Select value={params.get("type") ?? ""} onChange={(e) => apply({ type: e.target.value })} className="w-40" aria-label="Filter by entry type">
        <option value="">All types</option>
        <option value="call">Calls</option>
        <option value="note">Notes</option>
        <option value="email">Emails</option>
        <option value="system">System</option>
      </Select>
      {params.size > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>Clear</Button>
      ) : null}
    </div>
  );
}
