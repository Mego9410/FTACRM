"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";
import { changePassword } from "@/lib/actions/account";

/**
 * Shared password-change form. Used both in personal settings and on the
 * forced first-login screen. On success it either redirects (`redirectTo`) or
 * shows an inline confirmation.
 */
export function ChangePasswordForm({
  currentLabel = "Current password",
  submitLabel = "Update password",
  redirectTo,
}: {
  currentLabel?: string;
  submitLabel?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    const f = new FormData(e.currentTarget);
    const newPassword = String(f.get("new_password"));
    if (newPassword !== String(f.get("confirm"))) return setError("The new passwords don't match.");
    setBusy(true);
    const res = await changePassword({
      current_password: String(f.get("current_password")),
      new_password: newPassword,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    formRef.current?.reset();
    if (redirectTo) {
      router.replace(redirectTo);
      router.refresh();
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <Field label={currentLabel} htmlFor="cp_current">
        <Input id="cp_current" name="current_password" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" htmlFor="cp_new" hint="At least 10 characters">
        <Input id="cp_new" name="new_password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Confirm new password" htmlFor="cp_confirm">
        <Input id="cp_confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
      {done ? <p className="text-sm font-medium text-available-fg">Password updated.</p> : null}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
    </form>
  );
}
