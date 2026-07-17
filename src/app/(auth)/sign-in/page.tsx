import Image from "next/image";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/brand/logo.png" alt="Frank Taylor & Associates" width={72} height={72} className="rounded-md" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-fg-1">FTA CRM</h1>
            <p className="mt-1 text-sm text-fg-3">Sign in with your work account</p>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <Suspense>
            <SignInForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-fg-3">
          Frank Taylor &amp; Associates — internal system. Accounts are created by an administrator.
        </p>
      </div>
    </main>
  );
}
