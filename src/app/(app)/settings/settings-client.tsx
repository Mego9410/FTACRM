"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { SessionProfile } from "@/lib/auth";
import { Badge, Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui/primitives";
import { PageHeader } from "@/components/shell/page-header";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { updateMySettings, changeMyEmail, disconnectMicrosoft } from "./actions";

type Connection = {
  id: string;
  email: string | null;
  status: string;
  last_synced_at: string | null;
  last_error: string | null;
} | null;

export function SettingsClient({
  profile,
  connection,
  graphConfigured,
}: {
  profile: SessionProfile;
  connection: Connection;
  graphConfigured: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const f = new FormData(e.currentTarget);
    const res = await updateMySettings({
      full_name: String(f.get("full_name")),
      calendar_color: String(f.get("calendar_color")),
      signature_html: String(f.get("signature_html")) || null,
      phone: String(f.get("phone")) || null,
      job_title: String(f.get("job_title")) || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    setSaved(true);
    toast.success("Settings saved.");
    router.refresh();
  }

  async function savePrefs(next: { notify_inapp?: boolean; notify_email?: boolean }) {
    const res = await updateMySettings({
      full_name: profile.full_name,
      calendar_color: profile.calendar_color,
      signature_html: profile.signature_html ?? null,
      phone: profile.phone,
      job_title: profile.job_title,
      notify_inapp: next.notify_inapp ?? profile.notify_inapp,
      notify_email: next.notify_email ?? profile.notify_email,
    });
    if (!res.ok) return toast.error(res.error);
    toast.success("Preferences updated.");
    router.refresh();
  }

  async function submitEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const res = await changeMyEmail({ email: String(f.get("email")) });
    if (!res.ok) return toast.error(res.error);
    toast.success("Email updated.");
    router.refresh();
  }

  async function disconnect() {
    if (!window.confirm("Disconnect your Microsoft 365 account? Email and calendar will stop syncing.")) return;
    const res = await disconnectMicrosoft();
    if (!res.ok) return toast.error(res.error);
    toast.success("Microsoft 365 disconnected.");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="My settings" subtitle={profile.email} />
      <Card>
        <CardHeader title="Profile" />
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Full name" htmlFor="s_name">
            <Input id="s_name" name="full_name" defaultValue={profile.full_name} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title" htmlFor="s_job">
              <Input id="s_job" name="job_title" defaultValue={profile.job_title ?? ""} placeholder="e.g. Client Manager" />
            </Field>
            <Field label="Phone" htmlFor="s_phone">
              <Input id="s_phone" name="phone" defaultValue={profile.phone ?? ""} placeholder="e.g. 07…" />
            </Field>
          </div>
          <Field label="Calendar colour" htmlFor="s_color" hint="Your colour on the shared calendar and avatars">
            <Input id="s_color" name="calendar_color" type="color" defaultValue={profile.calendar_color} className="h-9.5 w-24 p-1" />
          </Field>
          <Field label="Email signature" htmlFor="s_sig" hint="HTML — appended to one-to-one emails sent from the CRM. Supports images and merge fields.">
            <Textarea id="s_sig" name="signature_html" defaultValue={profile.signature_html ?? ""} rows={4} />
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          {saved ? <p className="text-sm font-medium text-available-fg">Saved.</p> : null}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </form>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Account" />
        <div className="space-y-4 p-5">
          <form onSubmit={submitEmail} className="flex flex-wrap items-end gap-3">
            <Field label="Email address" htmlFor="s_email" className="min-w-[220px] flex-1">
              <Input id="s_email" name="email" type="email" defaultValue={profile.email} required />
            </Field>
            <Button type="submit" variant="outline">Update email</Button>
          </form>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-fg-3">Role</span>
            <span className="font-semibold capitalize text-fg-1">{profile.role}</span>
          </div>
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Notifications" />
        <div className="space-y-3 p-5">
          <label className="flex items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-fg-1">In-app notifications</span>
              <span className="block text-xs text-fg-3">Show alerts in the app for signatures, tasks, calls and more.</span>
            </span>
            <input
              type="checkbox"
              defaultChecked={profile.notify_inapp}
              onChange={(e) => void savePrefs({ notify_inapp: e.target.checked })}
              className="mt-1 h-4 w-4 accent-[#E4AD25]"
            />
          </label>
          <label className="flex items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-fg-1">Email notifications</span>
              <span className="block text-xs text-fg-3">Also email me important alerts (once email sending is enabled).</span>
            </span>
            <input
              type="checkbox"
              defaultChecked={profile.notify_email}
              onChange={(e) => void savePrefs({ notify_email: e.target.checked })}
              className="mt-1 h-4 w-4 accent-[#E4AD25]"
            />
          </label>
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Password" />
        <div className="p-5">
          <ChangePasswordForm submitLabel="Update password" />
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Microsoft 365" />
        <div className="p-5">
          {!graphConfigured ? (
            <div>
              <Badge tone="neutral">Not configured</Badge>
              <p className="mt-2 text-sm text-fg-3">
                Email and calendar sync is not linked in this deployment. Once an administrator adds the
                Microsoft credentials (see docs/integrations.md), you'll be able to connect your mailbox
                here so email files itself onto records and your Outlook calendar stays in sync.
              </p>
            </div>
          ) : connection ? (
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={connection.status === "active" ? "green" : "danger"}>
                  {connection.status === "active" ? "Connected" : connection.status}
                </Badge>
                <span className="text-sm text-fg-2">{connection.email}</span>
              </div>
              <p className="mt-2 text-xs text-fg-3">
                Last synced {connection.last_synced_at ? formatDateTime(connection.last_synced_at) : "never"}
                {connection.last_error ? ` · ${connection.last_error}` : ""}
              </p>
              <div className="mt-3 flex gap-2">
                {connection.status !== "active" ? (
                  <a href="/api/auth/microsoft/start">
                    <Button variant="outline" size="sm">Reconnect</Button>
                  </a>
                ) : null}
                <Button variant="ghost" size="sm" onClick={disconnect} className="text-fg-4 hover:text-danger">
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-fg-2">
                Connect your Microsoft 365 account to log email against contacts automatically and sync
                your Outlook calendar both ways.
              </p>
              <a href="/api/auth/microsoft/start">
                <Button variant="outline">Connect Microsoft 365</Button>
              </a>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
