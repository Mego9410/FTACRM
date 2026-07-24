import { getSignerView } from "@/lib/actions/signatures";
import { AspenWordmark } from "@/components/shell/brand";
import { SignView } from "./sign-view";

export const metadata = { title: "Sign document" };
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-surface-2">
      <div className="h-1 bg-gold" />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <AspenWordmark className="h-9 w-auto" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-4">Frank Taylor &amp; Associates</p>
        </div>
        {children}
      </div>
    </main>
  );
}

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await getSignerView({ token });

  if (!res.ok || !res.data) {
    return (
      <Shell>
        <div className="rounded-lg border border-line bg-surface p-6 text-center text-sm text-fg-3">
          {res.ok ? "This signing link is invalid or has expired." : res.error}
        </div>
      </Shell>
    );
  }
  if (res.data.status === "cancelled" || res.data.status === "declined") {
    return (
      <Shell>
        <div className="rounded-lg border border-line bg-surface p-6 text-center text-sm text-fg-3">
          This document is no longer available for signature.
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <SignView token={token} initial={res.data} />
    </Shell>
  );
}
