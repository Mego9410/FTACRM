"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui/primitives";
import { SortTh, useClientSort } from "@/components/ui/sortable";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { inviteUser, updateUser } from "./actions";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  calendar_color: string;
  is_active: boolean;
};

export function UsersClient({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const { sorted, toggle, stateFor } = useClientSort(
    users,
    {
      name: (u) => u.full_name,
      role: (u) => u.role,
      status: (u) => u.is_active,
    },
    { key: "name", dir: "asc" },
  );
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submitInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await inviteUser({
      email: String(f.get("email")),
      full_name: String(f.get("full_name")),
      role: String(f.get("role")),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setInviteOpen(false);
    router.refresh();
  }

  async function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await updateUser({
      id: editing.id,
      full_name: String(f.get("full_name")),
      role: String(f.get("role")),
      calendar_color: String(f.get("calendar_color")),
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
        title={`Users (${users.length})`}
        action={<Button size="sm" onClick={() => setInviteOpen(true)}>Invite user</Button>}
      />
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-fg-3">
            <SortTh label="Name" sortKey="name" state={stateFor("name")} onSort={toggle} className="px-5" />
            <SortTh label="Role" sortKey="role" state={stateFor("role")} onSort={toggle} />
            <SortTh label="Status" sortKey="status" state={stateFor("status")} onSort={toggle} />
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((u) => (
            <tr key={u.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
              <td className="px-5 py-2.5">
                <span className="flex items-center gap-2.5">
                  <Avatar name={u.full_name} size={28} color={u.calendar_color} />
                  <span>
                    <span className="block font-semibold text-fg-1">{u.full_name}</span>
                    <span className="block text-xs text-fg-3">{u.email}</span>
                  </span>
                </span>
              </td>
              <td className="px-3 py-2.5 capitalize">{u.role}</td>
              <td className="px-3 py-2.5">
                <Badge tone={u.is_active ? "green" : "neutral"}>{u.is_active ? "Active" : "Deactivated"}</Badge>
              </td>
              <td className="px-3 py-2.5 text-right">
                <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>Edit</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
</div>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite user">
        <form onSubmit={submitInvite} className="space-y-4">
          <Field label="Full name" htmlFor="inv_name">
            <Input id="inv_name" name="full_name" required />
          </Field>
          <Field label="Email" htmlFor="inv_email">
            <Input id="inv_email" name="email" type="email" required />
          </Field>
          <Field label="Role" htmlFor="inv_role">
            <Select id="inv_role" name="role" defaultValue="agent">
              <option value="agent">Agent</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrator</option>
            </Select>
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send invite"}</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={`Edit ${editing?.full_name ?? ""}`}>
        {editing ? (
          <form onSubmit={submitEdit} className="space-y-4">
            <Field label="Full name" htmlFor="ed_name">
              <Input id="ed_name" name="full_name" defaultValue={editing.full_name} required />
            </Field>
            <Field label="Role" htmlFor="ed_role">
              <Select id="ed_role" name="role" defaultValue={editing.role}>
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 items-end gap-3">
              <Field label="Calendar colour" htmlFor="ed_color">
                <Input id="ed_color" name="calendar_color" type="color" defaultValue={editing.calendar_color} className="h-9.5 p-1" />
              </Field>
              <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-fg-1">
                <input type="checkbox" name="is_active" defaultChecked={editing.is_active} className="h-4 w-4 accent-[#E4AD25]" />
                Active
              </label>
            </div>
            {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        ) : null}
      </Dialog>
    </Card>
  );
}
