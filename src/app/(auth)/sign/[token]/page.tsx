import { createAdminClient } from "@/lib/supabase/admin";
import { AspenWordmark } from "@/components/shell/brand";
import { applySignature, signatureBlock, SIGN_PENDING_HTML } from "@/lib/documents/render";
import { longDate } from "@/lib/documents/context";
import { SignForm } from "./sign-form";

export const metadata = { title: "Sign document" };
export const dynamic = "force-dynamic";

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: req } = await admin
    .from("signature_requests")
    .select("title, body_html, status, signer_name, signature_name, signed_at")
    .eq("token", token)
    .maybeSingle();

  const shell = (children: React.ReactNode) => (
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

  if (!req) {
    return shell(
      <div className="rounded-lg border border-line bg-surface p-6 text-center text-sm text-fg-3">
        This signing link is invalid or has expired.
      </div>,
    );
  }

  if (req.status === "cancelled" || req.status === "declined") {
    return shell(
      <div className="rounded-lg border border-line bg-surface p-6 text-center text-sm text-fg-3">
        This document is no longer available for signature.
      </div>,
    );
  }

  const signed = req.status === "signed";
  const sigHtml = signed
    ? signatureBlock(req.signature_name ?? req.signer_name, req.signed_at ? longDate(new Date(req.signed_at)) : longDate())
    : SIGN_PENDING_HTML;
  const documentHtml = applySignature(req.body_html, sigHtml);

  return shell(
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-white p-6 shadow-sm sm:p-10" dangerouslySetInnerHTML={{ __html: documentHtml }} />
      {signed ? (
        <div className="rounded-lg border border-available-fg/30 bg-private-bg px-5 py-4 text-center text-sm font-semibold text-private-fg">
          Signed{req.signed_at ? ` on ${longDate(new Date(req.signed_at))}` : ""}. Thank you — a copy has been returned to Frank Taylor &amp; Associates.
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <p className="mb-1 text-sm font-semibold text-fg-1">Sign this document</p>
          <p className="mb-4 text-sm text-fg-3">
            By typing your full name and clicking “Sign document” you agree this is your electronic signature on the
            document above.
          </p>
          <SignForm token={token} defaultName={req.signer_name} />
        </div>
      )}
    </div>,
  );
}
