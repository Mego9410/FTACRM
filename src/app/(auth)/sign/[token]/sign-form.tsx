"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";
import { submitSignature } from "@/lib/actions/signatures";

export function SignForm({ token, defaultName }: { token: string; defaultName: string }) {
  const router = useRouter();
  const [name, setName] = React.useState(defaultName);
  const [agree, setAgree] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agree) return setError("Please tick the box to confirm.");
    setBusy(true);
    setError(null);
    const res = await submitSignature({ token, signer_name: name });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Full name" htmlFor="sign_name">
        <Input
          id="sign_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          className="font-[cursive] text-lg"
        />
      </Field>
      <label className="flex items-start gap-2 text-sm text-fg-2">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#E4AD25]" />
        I agree that typing my name above constitutes my legal signature on this document.
      </label>
      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Signing…" : "Sign document"}
      </Button>
    </form>
  );
}
