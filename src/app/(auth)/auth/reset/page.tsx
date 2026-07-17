import { Suspense } from "react";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Set password" };
// Render at request time — prerendering would require Supabase env vars at build.
export const dynamic = "force-dynamic";

export default function ResetPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-fg-1">Set your password</h1>
          <p className="mt-1 text-sm text-fg-3">Choose a password to finish signing in.</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <Suspense>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
