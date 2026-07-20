"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { saveBranch } from "./actions";

type Branch = {
  id: string;
  name: string;
  town: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

export function BranchesClient({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Branch | "new" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const current = editing === "new" ? null : editing;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await saveBranch({
      id: current?.id,
      name: String(f.get("name")),
      town: String(f.get("town")) || null,
      phone: String(f.get("phone")) || null,
      email: String(f.get("email")) || null,
      is_active: f.get("is_active") === "on",
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title={`Branches (${branches.length})`}
        action={<Button size="sm" onClick={() => setEditing("new")}>Add branch</Button>}
      />
      {branches.length === 0 ? (
        <EmptyState className="m-4" title="No branches yet" body="Add your first branch — users and records can then be assigned to it." />
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-fg-3">
              <th className="px-5 py-2.5">Name</th>
              <th className="px-3 py-2.5">Town</th>
              <th className="px-3 py-2.5">Contact</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                <td className="px-5 py-2.5 font-semibold text-fg-1">{b.name}</td>
                <td className="px-3 py-2.5">{b.town ?? "—"}</td>
                <td className="px-3 py-2.5">{[b.phone, b.email].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-3 py-2.5">
                  <Badge tone={b.is_active ? "green" : "neutral"}>{b.is_active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(b)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={current ? `Edit ${current.name}` : "Add branch"}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name" htmlFor="br_name">
            <Input id="br_name" name="name" defaultValue={current?.name} required />
          </Field>
          <Field label="Town" htmlFor="br_town">
            <Input id="br_town" name="town" defaultValue={current?.town ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" htmlFor="br_phone">
              <Input id="br_phone" name="phone" defaultValue={current?.phone ?? ""} />
            </Field>
            <Field label="Email" htmlFor="br_email">
              <Input id="br_email" name="email" type="email" defaultValue={current?.email ?? ""} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-fg-1">
            <input type="checkbox" name="is_active" defaultChecked={current?.is_active ?? true} className="h-4 w-4 accent-[#E4AD25]" />
            Active
          </label>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </Card>
  );
}
