"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import { eraseContact, updateAml, updateConsent } from "../actions";

type ConsentContact = {
  id: string;
  consent_email: boolean | null;
  consent_sms: boolean | null;
  consent_phone: boolean | null;
  consent_letter: boolean | null;
  consent_updated_at: string | null;
  do_not_contact: boolean;
  identity_verified: boolean;
  address_verified: boolean;
};

function TriToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-sm font-medium text-fg-1">{label}</span>
      <div className="flex gap-1">
        {([
          [true, "Yes"],
          [false, "No"],
          [null, "?"],
        ] as const).map(([v, lbl]) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={
              value === v
                ? v === true
                  ? "rounded-full bg-private-bg px-2.5 py-0.5 text-xs font-bold text-private-fg"
                  : v === false
                    ? "rounded-full bg-danger-bg px-2.5 py-0.5 text-xs font-bold text-danger"
                    : "rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-bold text-fg-1"
                : "rounded-full px-2.5 py-0.5 text-xs font-semibold text-fg-4 hover:bg-surface-3"
            }
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConsentAmlPanel({ contact, canErase }: { contact: ConsentContact; canErase: boolean }) {
  const router = useRouter();
  const [state, setState] = React.useState(contact);
  const [busy, setBusy] = React.useState(false);
  const dirty =
    state.consent_email !== contact.consent_email ||
    state.consent_sms !== contact.consent_sms ||
    state.consent_phone !== contact.consent_phone ||
    state.consent_letter !== contact.consent_letter ||
    state.do_not_contact !== contact.do_not_contact;

  async function saveConsent() {
    setBusy(true);
    await updateConsent({
      id: contact.id,
      consent_email: state.consent_email,
      consent_sms: state.consent_sms,
      consent_phone: state.consent_phone,
      consent_letter: state.consent_letter,
      do_not_contact: state.do_not_contact,
    });
    setBusy(false);
    router.refresh();
  }

  async function toggleAml(field: "identity_verified" | "address_verified") {
    const next = { ...state, [field]: !state[field] };
    setState(next);
    await updateAml({
      id: contact.id,
      identity_verified: next.identity_verified,
      address_verified: next.address_verified,
    });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="GDPR consent" />
        <div className="px-5 py-3">
          <TriToggle label="Email" value={state.consent_email} onChange={(v) => setState((s) => ({ ...s, consent_email: v }))} />
          <TriToggle label="SMS" value={state.consent_sms} onChange={(v) => setState((s) => ({ ...s, consent_sms: v }))} />
          <TriToggle label="Phone" value={state.consent_phone} onChange={(v) => setState((s) => ({ ...s, consent_phone: v }))} />
          <TriToggle label="Letter" value={state.consent_letter} onChange={(v) => setState((s) => ({ ...s, consent_letter: v }))} />
          <label className="mt-2 flex items-center gap-2 border-t border-line pt-3 text-sm font-semibold text-danger">
            <input
              type="checkbox"
              checked={state.do_not_contact}
              onChange={(e) => setState((s) => ({ ...s, do_not_contact: e.target.checked }))}
              className="h-4 w-4 accent-[#C4382D]"
            />
            Do not contact (hard block)
          </label>
          <p className="mt-2 text-xs text-fg-3">
            {contact.consent_updated_at
              ? `Last updated ${formatDateTime(contact.consent_updated_at)}`
              : "Preferences never recorded."}
          </p>
          {dirty ? (
            <Button size="sm" className="mt-3 w-full" onClick={() => void saveConsent()} disabled={busy}>
              {busy ? "Saving…" : "Save consent"}
            </Button>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="AML / identity" />
        <div className="space-y-2 px-5 py-4">
          <label className="flex items-center gap-2 text-sm font-medium text-fg-1">
            <input type="checkbox" checked={state.identity_verified} onChange={() => void toggleAml("identity_verified")} className="h-4 w-4 accent-[#E4AD25]" />
            Identity verified
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-fg-1">
            <input type="checkbox" checked={state.address_verified} onChange={() => void toggleAml("address_verified")} className="h-4 w-4 accent-[#E4AD25]" />
            Address verified
          </label>
          <p className="text-xs text-fg-3">Attach ID evidence under Documents → ID / AML.</p>
        </div>
      </Card>

      {canErase ? (
        <Card className="border-danger/30">
          <CardHeader title="GDPR erasure" />
          <div className="px-5 py-4">
            <p className="mb-3 text-xs text-fg-3">
              Permanently anonymises this person: name, contact details, notes, journal bodies and
              documents are removed. Deal and offer history remains, anonymised. Irreversible.
            </p>
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={async () => {
                if (!window.confirm("Erase this contact's personal data? This cannot be undone.")) return;
                if (!window.confirm("Final check — erase permanently?")) return;
                const res = await eraseContact({ id: contact.id });
                if (!res.ok) window.alert(res.error);
                router.refresh();
              }}
            >
              Erase personal data
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
