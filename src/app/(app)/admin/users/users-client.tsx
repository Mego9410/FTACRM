"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui/primitives";
import { SortTh, useClientSort } from "@/components/ui/sortable";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { createUser, updateUser } from "./actions";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  calendar_color: string;
  is_active: boolean;
};

// A shared starting password for new accounts. The admin can change it per user;
// either way the new user is forced to set their own on first sign-in.
const DEFAULT_TEMP_PASSWORD = "FTA-Welcome-2026";

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
  const [addOpen, setAddOpen] = React.useState(false);
  const [created, setCreated] = React.useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  function openAdd() {
    setCreated(null);
    setCopied(false);
    setError(null);
    setAddOpen(true);
  }

  async function submitAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("temp_password"));
    const res = await createUser({
      email,
      full_name: String(f.get("full_name")),
      role: String(f.get("role")),
      temp_password: password,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    // Keep the dialog open to show the credentials the admin needs to pass on.
    setCreated({ email, password });
    router.refresh();
  }

  async function copyCredentials() {
    if (!created) return;
    await navigator.clipboard.writeText(
      `Aspen sign-in\nEmail: ${created.email}\nTemporary password: ${created.password}\nYou'll be asked to set your own password on first sign-in.`,
    );
    setCopied(true);
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
        action={<Button size="sm" onClick={openAdd}>Add user</Button>}
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

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add user">
        {created ? (
          <div className="space-y-4">
            <p className="text-sm text-fg-2">
              Account created for <span className="font-semibold text-fg-1">{created.email}</span>. Share these
              details with them — they'll be asked to set their own password when they first sign in.
            </p>
            <dl className="space-y-2 rounded-md border border-line bg-surface-2 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-fg-3">Email</dt>
                <dd className="font-semibold text-fg-1">{created.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-3">Temporary password</dt>
                <dd className="font-mono font-semibold text-fg-1">{created.password}</dd>
              </div>
            </dl>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={copyCredentials}>
                {copied ? "Copied" : "Copy details"}
              </Button>
              <Button type="button" onClick={() => setAddOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submitAdd} className="space-y-4">
            <Field label="Full name" htmlFor="add_name">
              <Input id="add_name" name="full_name" required />
            </Field>
            <Field label="Email" htmlFor="add_email">
              <Input id="add_email" name="email" type="email" required />
            </Field>
            <Field label="Role" htmlFor="add_role">
              <Select id="add_role" name="role" defaultValue="agent">
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </Select>
            </Field>
            <Field
              label="Temporary password"
              htmlFor="add_pw"
              hint="Share this with the new user. They'll be required to change it on first sign-in."
            >
              <Input id="add_pw" name="temp_password" type="text" defaultValue={DEFAULT_TEMP_PASSWORD} required minLength={10} />
            </Field>
            {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
            </DialogFooter>
          </form>
        )}
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
