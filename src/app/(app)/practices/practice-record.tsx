"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import type { LookupValue } from "@/lib/lookups";
import { Badge, Button, Card, CardHeader, LookupPill } from "@/components/ui/primitives";
import { SlideOver } from "@/components/ui/slide-over";
import { formatDate, formatGBP } from "@/lib/utils";
import { PracticeForm, type PracticeFormValues, type PracticeSection } from "./practice-form";

const SECTION_TITLES: Record<PracticeSection, string> = {
  identity: "Identity",
  location: "Location",
  dental: "Dental profile",
  pricing: "Price, fees and dates",
  assignment: "Assignment",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-wide text-fg-3">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-fg-1 break-words">{children ?? "—"}</dd>
    </div>
  );
}

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : v;

export function PracticeRecord({
  practice,
  lookups,
  owners,
  branches,
}: {
  practice: PracticeFormValues & { id: string };
  lookups: {
    fundings: LookupValue[];
    tenures: LookupValue[];
    structures: LookupValue[];
    specialisms: LookupValue[];
  };
  owners: { id: string; full_name: string }[];
  branches: { id: string; name: string }[];
}) {
  const [editing, setEditing] = React.useState<PracticeSection | null>(null);

  const lookupName = (list: LookupValue[], id: string | null) =>
    list.find((v) => v.id === id)?.value ?? null;
  const structurePills = lookups.structures.filter((s) => practice.deal_structure_ids.includes(s.id));
  const specialismPills = lookups.specialisms.filter((s) => practice.specialism_ids.includes(s.id));
  const ownerName = owners.find((o) => o.id === practice.owner_id)?.full_name ?? null;
  const branchName = branches.find((b) => b.id === practice.branch_id)?.name ?? null;

  const editButton = (section: PracticeSection) => (
    <Button variant="outline" size="sm" onClick={() => setEditing(section)} className="gap-1.5">
      <Pencil size={13} /> Edit
    </Button>
  );

  const address = [
    practice.address_line1,
    practice.address_line2,
    practice.town,
    practice.county,
    practice.postcode,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Identity" action={editButton("identity")} />
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Row label="Marketing title">{practice.display_title}</Row>
          <Row label="Trading name">{dash(practice.name)}</Row>
          <Row label="Confidentiality">
            {practice.confidential ? (
              <Badge tone="warn">Confidential listing</Badge>
            ) : (
              <Badge>Name and address may appear in outbound material</Badge>
            )}
          </Row>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Location" action={editButton("location")} />
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Row label="Address">
            {address.length ? address.join(", ") : "—"}
          </Row>
          <Row label="Postcode">{dash(practice.postcode)}</Row>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Dental profile" action={editButton("dental")} />
        <div className="space-y-4 p-5">
          <dl className="grid gap-4 sm:grid-cols-3">
            <Row label="Funding">{dash(lookupName(lookups.fundings, practice.funding_type_id))}</Row>
            <Row label="Tenure">{dash(lookupName(lookups.tenures, practice.tenure_type_id))}</Row>
            <Row label="Lease expiry">{practice.lease_expiry ? formatDate(practice.lease_expiry) : "—"}</Row>
            <Row label="Surgeries">{dash(practice.surgeries)}</Row>
            <Row label="UDAs">{practice.udas === null ? "—" : practice.udas.toLocaleString("en-GB")}</Row>
            <Row label="Staff">{dash(practice.staff_count)}</Row>
            <Row label="Annual turnover">{formatGBP(practice.annual_turnover)}</Row>
            <Row label="EBITDA">{formatGBP(practice.ebitda)}</Row>
            <Row label="NHS contract value">{formatGBP(practice.nhs_contract_value)}</Row>
          </dl>
          <div>
            <p className="text-xs font-semibold tracking-wide text-fg-3">Deal structures the seller will entertain</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {structurePills.length
                ? structurePills.map((s) => <LookupPill key={s.id} color={s.color}>{s.value}</LookupPill>)
                : <span className="text-sm text-fg-3">—</span>}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-fg-3">Specialisms</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {specialismPills.length
                ? specialismPills.map((s) => <LookupPill key={s.id} color={s.color}>{s.value}</LookupPill>)
                : <span className="text-sm text-fg-3">—</span>}
            </div>
          </div>
          {practice.description ? (
            <div>
              <p className="text-xs font-semibold tracking-wide text-fg-3">Marketing description</p>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-fg-2">{practice.description}</p>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="Price, fees and dates" action={editButton("pricing")} />
        <dl className="grid gap-4 p-5 sm:grid-cols-3">
          <Row label="Asking price">
            {practice.asking_price
              ? `${practice.price_prefix === "offers_over" ? "Offers over " : ""}${formatGBP(practice.asking_price)}`
              : "POA"}
          </Row>
          <Row label="Price basis">
            {{ guide: "Guide price", offers_over: "Offers over", fixed: "Fixed", poa: "POA" }[practice.price_prefix] ??
              practice.price_prefix}
          </Row>
          <Row label="Fee">
            {practice.fee_percent !== null
              ? `${practice.fee_percent}%`
              : practice.fee_fixed !== null
                ? formatGBP(practice.fee_fixed)
                : "—"}
          </Row>
          <Row label="Instructed">{practice.instructed_at ? formatDate(practice.instructed_at) : "—"}</Row>
          <Row label="Agency contract expiry">
            {practice.contract_expiry ? formatDate(practice.contract_expiry) : "—"}
          </Row>
          <Row label="Best and final closing date">
            {practice.closing_date ? (
              <Badge tone="warn">{formatDate(practice.closing_date)}</Badge>
            ) : (
              "Not set"
            )}
          </Row>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Assignment" action={editButton("assignment")} />
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Row label="Owner">{dash(ownerName) || "Unassigned"}</Row>
          <Row label="Branch">{dash(branchName)}</Row>
        </dl>
      </Card>

      <SlideOver
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${SECTION_TITLES[editing].toLowerCase()}` : ""}
        width="lg"
      >
        {editing ? (
          <PracticeForm
            initial={practice}
            lookups={lookups}
            owners={owners}
            branches={branches}
            section={editing}
            onSaved={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </SlideOver>
    </div>
  );
}
