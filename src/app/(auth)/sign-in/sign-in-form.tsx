"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input } from "@/components/ui/primitives";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError("Incorrect email or password.");
      setBusy(false);
      return;
    }
    router.replace(params.get("next") ?? "/dashboard");
    router.refresh();
  }

  async function onForgot(email: string) {
    if (!email) {
      setError("Enter your email first, then choose forgotten password.");
      return;
    }
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setResetSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@ft-associates.com" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
      {resetSent ? (
        <p className="text-sm font-medium text-available-fg">
          If that account exists, a reset link is on its way.
        </p>
      ) : null}
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <button
        type="button"
        className="w-full text-center text-sm font-semibold text-gold-deep hover:underline"
        onClick={(e) => {
          const email = (e.currentTarget.form?.elements.namedItem("email") as HTMLInputElement)?.value;
          void onForgot(email);
        }}
      >
        Forgotten password?
      </button>
    </form>
  );
}
