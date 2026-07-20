import Image from "next/image";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };
// Render at request time — prerendering would require Supabase env vars at build.
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col bg-ink">
      <div className="h-1 bg-gold" />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <Image src="/brand/logo.png" alt="" width={64} height={64} className="rounded-md shadow-gold" />
            <div>
              <h1 className="font-serif text-[22px] font-semibold tracking-tight text-gold">
                Frank Taylor <span className="text-white/90">&amp;</span> Associates
              </h1>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">
                Practice sales CRM
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-surface p-6 shadow-lg">
            <p className="mb-4 text-sm font-semibold text-fg-1">Sign in with your work account</p>
            <Suspense>
              <SignInForm />
            </Suspense>
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-white/40">
            Internal system — accounts are created by an administrator.
            <br />
            Guiding practice owners with integrity since 1990.
          </p>
        </div>
      </div>
    </main>
  );
}
