"use client";

import * as React from "react";
import Link from "next/link";
import { AspenWordmark } from "@/components/shell/brand";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    // Surface for server logs / observability without exposing detail to users.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-2 px-6 text-center">
      <AspenWordmark className="mb-6 h-8 w-auto" />
      <h1 className="text-xl font-bold text-fg-1">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-fg-3">
        We hit an unexpected error. You can try again, or head back to the dashboard. If it keeps happening, let the team know.
      </p>
      {error.digest ? <p className="mt-2 text-[11px] text-fg-4">Reference: {error.digest}</p> : null}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-[10px] bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-deep"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-[10px] border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-fg-1 transition-colors hover:bg-surface-2"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
