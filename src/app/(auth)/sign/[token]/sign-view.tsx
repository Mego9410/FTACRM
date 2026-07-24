"use client";

import * as React from "react";
import { Button, Field, Input } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { getSignerView, submitSignature, type SignerView, type SignerPublic } from "@/lib/actions/signatures";

const POLL_MS = 12_000;

function statusText(s: SignerPublic): string {
  if (s.status === "signed") return s.signed_at ? `Signed ${formatDate(s.signed_at)}` : "Signed";
  if (s.status === "viewed") return "Opened — not yet signed";
  if (s.status === "declined") return "Declined";
  return "Awaiting signature";
}
function statusDot(status: SignerPublic["status"]): string {
  return status === "signed" ? "bg-available-fg" : status === "declined" ? "bg-danger" : "bg-fg-4";
}

export function SignView({ token, initial }: { token: string; initial: SignerView }) {
  const [view, setView] = React.useState<SignerView>(initial);
  const [name, setName] = React.useState(initial.me?.signer_name ?? "");
  const [agree, setAgree] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mine = view.me;
  const iSigned = mine?.status === "signed";
  const multi = view.signers.length > 1;

  const refresh = React.useCallback(async () => {
    const res = await getSignerView({ token });
    if (res.ok && res.data) setView(res.data);
  }, [token]);

  // Poll so each party sees the other's progress appear without reloading. Stop
  // once everyone has signed.
  React.useEffect(() => {
    if (view.allSigned) return;
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [view.allSigned, refresh]);

  async function sign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agree) return setError("Please tick the box to confirm.");
    setBusy(true);
    setError(null);
    const res = await submitSignature({ token, signer_name: name });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    await refresh();
  }

  return (
    <div className="space-y-5">
      {/* Progress panel — who has signed */}
      {multi ? (
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-3">Signatures</p>
          <ul className="space-y-1.5">
            {view.signers.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(s.status)}`} />
                <span className="font-semibold text-fg-1">
                  {s.party_label}
                  {s.isYou ? " (you)" : ""}
                </span>
                <span className="ml-auto text-fg-3">{statusText(s)}</span>
              </li>
            ))}
          </ul>
          {view.allSigned ? (
            <p className="mt-3 text-sm font-semibold text-private-fg">All parties have signed — this agreement is complete.</p>
          ) : (
            <p className="mt-3 text-xs text-fg-4">This updates automatically as each party signs.</p>
          )}
        </div>
      ) : null}

      <div className="rounded-lg border border-line bg-white p-6 shadow-sm sm:p-10" dangerouslySetInnerHTML={{ __html: view.documentHtml }} />

      {iSigned ? (
        <div className="rounded-lg border border-available-fg/30 bg-private-bg px-5 py-4 text-center text-sm font-semibold text-private-fg">
          {multi
            ? view.allSigned
              ? "Signed. All parties have now signed — a copy has been returned to Frank Taylor & Associates."
              : "Signed. Thank you — we’re now waiting on the other party. You’ll see it update here once they sign."
            : "Signed. Thank you — a copy has been returned to Frank Taylor & Associates."}
        </div>
      ) : !mine ? (
        <div className="rounded-lg border border-line bg-surface p-6 text-center text-sm text-fg-3">
          This signing link is no longer active.
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <p className="mb-1 text-sm font-semibold text-fg-1">
            Sign this document{multi ? ` as ${mine.party_label}` : ""}
          </p>
          <p className="mb-4 text-sm text-fg-3">
            By typing your full name and clicking “Sign document” you agree this is your electronic signature on the document above.
          </p>
          <form onSubmit={sign} className="space-y-4">
            <Field label="Full name" htmlFor="sign_name">
              <Input
                id="sign_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className="font-[cursive] text-lg"
              />
            </Field>
            <label className="flex items-start gap-2 text-sm text-fg-2">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#E4AD25]" />
              I agree that typing my name above constitutes my legal signature on this document.
            </label>
            {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Signing…" : "Sign document"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
