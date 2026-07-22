"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import type { LookupValue } from "@/lib/lookups";
import { Badge, Button, Card, CardHeader } from "@/components/ui/primitives";
import { SlideOver } from "@/components/ui/slide-over";
import { ROLE_LABELS } from "@/lib/contact-helpers";
import { ContactForm, type ContactFormValues, type ContactSection } from "./contact-form";

const SECTION_TITLES: Record<ContactSection, string> = {
  identity: "who they are",
  contact: "contact details",
  address: "address",
  crm: "CRM details",
};

const TEMP_TONE: Record<string, "danger" | "warn" | "neutral"> = {
  hot: "danger",
  warm: "warn",
  cold: "neutral",
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

export function ContactRecord({
  contact,
  sources,
}: {
  contact: ContactFormValues & { id: string };
  sources: LookupValue[];
}) {
  const [editing, setEditing] = React.useState<ContactSection | null>(null);

  const sourceName = sources.find((s) => s.id === contact.source_id)?.value ?? null;

  const editButton = (section: ContactSection) => (
    <Button variant="outline" size="sm" onClick={() => setEditing(section)} className="gap-1.5">
      <Pencil size={13} /> Edit
    </Button>
  );

  const address = [
    contact.address_line1,
    contact.address_line2,
    contact.town,
    contact.county,
    contact.postcode,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Who they are" action={editButton("identity")} />
        <div className="space-y-4 p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Row label="Type">{contact.kind === "organisation" ? "Organisation" : "Person"}</Row>
            <Row label="Roles">
              <div className="flex flex-wrap gap-1.5">
                {contact.roles.length
                  ? contact.roles.map((r) => <Badge key={r}>{ROLE_LABELS[r] ?? r}</Badge>)
                  : "—"}
              </div>
            </Row>
            <Row label="Name">
              {[contact.title, contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"}
            </Row>
            <Row label="Company name">{dash(contact.company_name)}</Row>
            <Row label="Salutation">{dash(contact.salutation)}</Row>
          </dl>
        </div>
      </Card>

      <Card>
        <CardHeader title="Contact details" action={editButton("contact")} />
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Row label="Email">{dash(contact.email)}</Row>
          <Row label="Secondary email">{dash(contact.email_secondary)}</Row>
          <Row label="Mobile">{dash(contact.mobile)}</Row>
          <Row label="Phone">{dash(contact.phone)}</Row>
          <Row label="Work phone">{dash(contact.work_phone)}</Row>
          <Row label="Website">{dash(contact.website)}</Row>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Address" action={editButton("address")} />
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Row label="Address">{address.length ? address.join(", ") : "—"}</Row>
          <Row label="Postcode">{dash(contact.postcode)}</Row>
        </dl>
      </Card>

      <Card>
        <CardHeader title="CRM" action={editButton("crm")} />
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <Row label="Source">{dash(sourceName)}</Row>
          <Row label="Temperature">
            {contact.temperature ? (
              <Badge tone={TEMP_TONE[contact.temperature] ?? "neutral"} className="capitalize">
                {contact.temperature}
              </Badge>
            ) : (
              "Not set"
            )}
          </Row>
          <Row label="Status">{dash(contact.status)}</Row>
          {contact.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold tracking-wide text-fg-3">Contact notes</dt>
              <dd className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-fg-2">{contact.notes}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <SlideOver
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${SECTION_TITLES[editing]}` : ""}
        width="lg"
      >
        {editing ? (
          <ContactForm
            initial={contact}
            sources={sources}
            section={editing}
            onSaved={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </SlideOver>
    </div>
  );
}
