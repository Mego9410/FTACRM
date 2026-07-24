import Link from "next/link";
import { AspenWordmark } from "@/components/shell/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-2 px-6 text-center">
      <AspenWordmark className="mb-6 h-8 w-auto" />
      <p className="text-[64px] font-extrabold leading-none tracking-tight text-gold">404</p>
      <h1 className="mt-2 text-xl font-bold text-fg-1">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-sm text-sm text-fg-3">
        The page may have moved, or the link might be out of date. Let&apos;s get you back on track.
      </p>
      <div className="mt-6 flex gap-2">
        <Link
          href="/dashboard"
          className="rounded-[10px] bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold-deep"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
