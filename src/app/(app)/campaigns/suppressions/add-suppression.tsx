"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui/primitives";
import { addSuppression } from "../actions";

export function AddSuppressionForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!email) return;
        setBusy(true);
        const res = await addSuppression({ email });
        setBusy(false);
        if (!res.ok) return window.alert(res.error);
        setEmail("");
        router.refresh();
      }}
    >
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="block@example.com"
        className="w-56"
        aria-label="Email to suppress"
      />
      <Button type="submit" size="sm" variant="outline" disabled={busy || !email}>
        {busy ? "Adding…" : "Block address"}
      </Button>
    </form>
  );
}
