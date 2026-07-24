"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import type { FirmSettings } from "@/lib/firm-settings";
import { updateFirmSettings } from "./actions";

export function FirmSettingsClient({ settings }: { settings: FirmSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const res = await updateFirmSettings({
      company_name: String(f.get("company_name")),
      trading_name: String(f.get("trading_name")) || null,
      address: String(f.get("address")) || null,
      phone: String(f.get("phone")) || null,
      email: String(f.get("email")) || null,
      website: String(f.get("website")) || null,
      default_fee_percent: String(f.get("default_fee_percent")) || null,
      default_min_fee: String(f.get("default_min_fee")) || null,
      email_from: String(f.get("email_from")) || null,
      email_reply_to: String(f.get("email_reply_to")) || null,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Firm settings saved.");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-fg-1">Firm settings</h2>
        <p className="text-sm text-fg-3">Company identity, default fees and email sender — used across documents and outbound mail.</p>
      </div>
      <form onSubmit={submit}>
        <Card>
          <CardHeader title="Company" />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name" htmlFor="f_name">
                <Input id="f_name" name="company_name" defaultValue={settings.company_name} required />
              </Field>
              <Field label="Trading name" htmlFor="f_trading">
                <Input id="f_trading" name="trading_name" defaultValue={settings.trading_name ?? ""} />
              </Field>
            </div>
            <Field label="Address" htmlFor="f_addr">
              <Textarea id="f_addr" name="address" defaultValue={settings.address ?? ""} rows={3} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Phone" htmlFor="f_phone">
                <Input id="f_phone" name="phone" defaultValue={settings.phone ?? ""} />
              </Field>
              <Field label="Email" htmlFor="f_email">
                <Input id="f_email" name="email" type="email" defaultValue={settings.email ?? ""} />
              </Field>
              <Field label="Website" htmlFor="f_web">
                <Input id="f_web" name="website" defaultValue={settings.website ?? ""} />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="mt-5">
          <CardHeader title="Fees" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Default commission %" htmlFor="f_fee" hint="Pre-fills the fee on new documents">
              <Input id="f_fee" name="default_fee_percent" type="number" step="0.1" defaultValue={settings.default_fee_percent ?? ""} />
            </Field>
            <Field label="Default minimum fee" htmlFor="f_min" hint='e.g. "£12,000"'>
              <Input id="f_min" name="default_min_fee" defaultValue={settings.default_min_fee ?? ""} />
            </Field>
          </div>
        </Card>

        <Card className="mt-5">
          <CardHeader title="Email sending" />
          <div className="space-y-4 p-5">
            <Field label="From address" htmlFor="f_from" hint='e.g. "Frank Taylor & Associates <no-reply@ft-associates.com>". Env RESEND_FROM overrides this.'>
              <Input id="f_from" name="email_from" defaultValue={settings.email_from ?? ""} />
            </Field>
            <Field label="Reply-to" htmlFor="f_reply">
              <Input id="f_reply" name="email_reply_to" defaultValue={settings.email_reply_to ?? ""} />
            </Field>
          </div>
        </Card>

        <div className="mt-5">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save firm settings"}</Button>
        </div>
      </form>
    </div>
  );
}
