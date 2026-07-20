import Image from "next/image";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };
// Render at request time — prerendering would require Supabase env vars at build.
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col bg-surface-2">
      <div className="h-1 bg-gold" />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <Image src="/brand/logo.png" alt="" width={64} height={64} className="rounded-md shadow-sm" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-fg-1">
                Vantage<span className="text-gold-deep">.</span>
              </h1>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fg-4">
                Frank Taylor &amp; Associates
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-fg-1">Sign in with your work account</p>
            <Suspense>
              <SignInForm />
            </Suspense>
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-fg-3">
            Internal system — accounts are created by an administrator.
            <br />
            Guiding practice owners with integrity since 1990.
          </p>
        </div>
      </div>
    </main>
  );
}
