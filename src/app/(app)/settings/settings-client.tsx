"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { SessionProfile } from "@/lib/auth";
import { Badge, Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui/primitives";
import { PageHeader } from "@/components/shell/page-header";
import { formatDateTime } from "@/lib/utils";
import { updateMySettings } from "./actions";

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
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSaved(true);
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
          <Field label="Calendar colour" htmlFor="s_color" hint="Your colour on the shared calendar and avatars">
            <Input id="s_color" name="calendar_color" type="color" defaultValue={profile.calendar_color} className="h-9.5 w-24 p-1" />
          </Field>
          <Field label="Email signature" htmlFor="s_sig" hint="Appended to one-to-one emails sent from the CRM">
            <Textarea id="s_sig" name="signature_html" defaultValue={profile.signature_html ?? ""} rows={4} />
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          {saved ? <p className="text-sm font-medium text-available-fg">Saved.</p> : null}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </form>
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
