"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Link2, MapPin, Rocket } from "lucide-react";
import type { LookupValue } from "@/lib/lookups";
import { Badge, Button, Field, LookupPill, Select } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { RecordWarning } from "@/components/record/record-warning";
import { PRACTICE_STATUS_LABELS, PRACTICE_STATUS_TONES } from "@/lib/contact-helpers";
import { practiceLabel } from "@/lib/practice-helpers";
import { formatGBP } from "@/lib/utils";
import { changePracticeStatus } from "../actions";

type HeaderPractice = {
  id: string;
  ref: string;
  display_title: string;
  name: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  status: string;
  asking_price: number | null;
  price_prefix: string;
  funding: { value: string; color: string | null } | null;
  tenure: string | null;
  surgeries: number | null;
  confidential: boolean;
  contract_expiry: string | null;
  seller: { id: string; name: string } | null;
  warning: string | null;
};

// Which transitions make sense from each status (withdrawn from any live state).
const NEXT_STATUSES: Record<string, string[]> = {
  valuation: ["preparing", "available", "withdrawn"],
  preparing: ["available", "valuation", "withdrawn"],
  available: ["under_offer", "preparing", "withdrawn"],
  under_offer: ["sold_stc", "available", "withdrawn"],
  sold_stc: ["completed", "available", "withdrawn"],
  completed: [],
  withdrawn: ["valuation", "available"],
};

export function PracticeHeader({
  practice,
  withdrawalReasons,
  publicToken,
}: {
  practice: HeaderPractice;
  withdrawalReasons: LookupValue[];
  publicToken?: string | null;
}) {
  const router = useRouter();
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<string | null>(null);
  const [reasonId, setReasonId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const expiring =
    practice.contract_expiry &&
    !["completed", "withdrawn"].includes(practice.status) &&
    new Date(practice.contract_expiry) < new Date(Date.now() + 60 * 86_400_000);

  const launchable = ["preparing", "available"].includes(practice.status);

  async function launch() {
    setBusy(true);
    // Preparing → available as it goes to market; already-available stays put.
    if (practice.status === "preparing") {
      const res = await changePracticeStatus({ id: practice.id, status: "available", withdrawal_reason_id: null });
      if (!res.ok) {
        setBusy(false);
        window.alert(res.error);
        return;
      }
    }
    router.push(`/launches/new?practice=${practice.id}`);
  }

  async function applyStatus(status: string) {
    if (status === "withdrawn" && !reasonId) {
      setError("Pick a withdrawal reason.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await changePracticeStatus({
      id: practice.id,
      status,
      withdrawal_reason_id: status === "withdrawn" ? reasonId : null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setStatusOpen(false);
    setPendingStatus(null);
    router.refresh();
  }

  return (
    <div className="mb-5">
      <RecordWarning table="practices" id={practice.id} warning={practice.warning} />
      {expiring ? (
        <div className="mb-3 rounded-sm border border-warn/30 bg-warn-bg px-4 py-2.5 text-sm font-semibold text-warn">
          Agency contract expires {practice.contract_expiry} — renew or conclude before it lapses.
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[30px] font-extrabold tracking-tight text-fg-1">{practiceLabel(practice)}</h1>
            <Badge tone={PRACTICE_STATUS_TONES[practice.status] ?? "neutral"}>
              {PRACTICE_STATUS_LABELS[practice.status] ?? practice.status}
            </Badge>
            {practice.funding ? (
              <LookupPill color={practice.funding.color}>{practice.funding.value}</LookupPill>
            ) : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-fg-3">
            <span>{practice.ref}</span>
            {practice.display_title ? (
              <span className="inline-flex items-center gap-1"><Building2 size={13} /> {practice.display_title}</span>
            ) : null}
            {(practice.town ?? practice.postcode) ? (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {[practice.town, practice.postcode].filter(Boolean).join(", ")}
              </span>
            ) : null}
            {practice.tenure ? <span>{practice.tenure}</span> : null}
            {practice.surgeries ? <span>{practice.surgeries} surgeries</span> : null}
            {practice.seller ? (
              <span>
                Seller:{" "}
                <Link href={`/contacts/${practice.seller.id}`} className="font-semibold text-gold-deep hover:underline">
                  {practice.seller.name}
                </Link>
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className="text-[24px] font-extrabold tracking-tight text-gold-deep">
            {practice.asking_price
              ? `${practice.price_prefix === "offers_over" ? "Offers over " : ""}${formatGBP(practice.asking_price)}`
              : "POA"}
          </p>
          {publicToken ? (
            <a href={`/p/${publicToken}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" title="Open the public landing page in a new tab">
                <Link2 size={14} /> Public page
              </Button>
            </a>
          ) : null}
          {NEXT_STATUSES[practice.status]?.length ? (
            <Button variant="outline" size="sm" onClick={() => setStatusOpen(true)}>
              Change status
            </Button>
          ) : null}
          {launchable ? (
            <Button size="sm" onClick={() => void launch()} disabled={busy} title="Set up a launch to matched buyers">
              <Rocket size={14} /> Launch
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={statusOpen} onClose={() => { setStatusOpen(false); setPendingStatus(null); }} title="Change status">
        <div className="space-y-3">
          <p className="text-sm text-fg-2">
            Currently <strong>{PRACTICE_STATUS_LABELS[practice.status]}</strong>. Move to:
          </p>
          <div className="flex flex-wrap gap-2">
            {(NEXT_STATUSES[practice.status] ?? []).map((s) => (
              <Button
                key={s}
                variant={pendingStatus === s ? "dark" : "outline"}
                size="sm"
                onClick={() => setPendingStatus(s)}
              >
                {PRACTICE_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
          {pendingStatus === "withdrawn" ? (
            <Field label="Withdrawal reason" htmlFor="wd_reason">
              <Select id="wd_reason" value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
                <option value="">Choose…</option>
                {withdrawalReasons.map((r) => (
                  <option key={r.id} value={r.id}>{r.value}</option>
                ))}
              </Select>
            </Field>
          ) : null}
          {pendingStatus === "under_offer" ? (
            <p className="text-xs text-fg-3">
              Tip: accepting an offer from the Offers tab moves the practice here and creates the deal
              automatically.
            </p>
          ) : null}
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setStatusOpen(false); setPendingStatus(null); }}>Cancel</Button>
            <Button disabled={!pendingStatus || busy} onClick={() => pendingStatus && void applyStatus(pendingStatus)}>
              {busy ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
