"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/primitives";
import { setPermission } from "./actions";

export function PermissionsClient({
  allPermissions,
  grants,
}: {
  allPermissions: { key: string; label: string }[];
  grants: { role: string; permission: string }[];
}) {
  const router = useRouter();
  const [busyCell, setBusyCell] = React.useState<string | null>(null);

  const has = (role: string, permission: string) =>
    grants.some((g) => g.role === role && g.permission === permission);

  async function toggle(role: "manager" | "agent", permission: string) {
    const cell = `${role}:${permission}`;
    setBusyCell(cell);
    await setPermission({ role, permission, granted: !has(role, permission) });
    setBusyCell(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title="Role permissions" />
      <div className="px-5 py-3 text-sm text-fg-3">
        Administrators hold every permission. Tick what managers and agents may do.
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-fg-3">
            <th className="px-5 py-2.5">Permission</th>
            <th className="px-3 py-2.5 text-center">Manager</th>
            <th className="px-3 py-2.5 text-center">Agent</th>
          </tr>
        </thead>
        <tbody>
          {allPermissions.map((p) => (
            <tr key={p.key} className="border-b border-line last:border-0">
              <td className="px-5 py-2.5">
                <span className="font-semibold text-fg-1">{p.label}</span>
                <span className="ml-2 text-xs text-fg-4">{p.key}</span>
              </td>
              {(["manager", "agent"] as const).map((role) => (
                <td key={role} className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={has(role, p.key)}
                    disabled={busyCell === `${role}:${p.key}`}
                    onChange={() => void toggle(role, p.key)}
                    className="h-4 w-4 cursor-pointer accent-[#E4AD25]"
                    aria-label={`${role} — ${p.label}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
</div>
    </Card>
  );
}
