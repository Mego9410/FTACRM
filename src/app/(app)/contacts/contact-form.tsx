"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { LookupValue } from "@/lib/lookups";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { createContact, updateContact } from "./actions";

export type ContactFormValues = {
  id?: string;
  kind: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  salutation: string | null;
  email: string | null;
  email_secondary: string | null;
  phone: string | null;
  mobile: string | null;
  work_phone: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  roles: string[];
  status: string | null;
  source_id: string | null;
  owner_id: string | null;
  branch_id: string | null;
  temperature: string | null;
  notes: string | null;
};

const ROLE_OPTIONS = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "solicitor", label: "Solicitor" },
  { value: "other", label: "Other" },
];

export type ContactSection = "identity" | "contact" | "address" | "crm";

export function ContactForm({
  initial,
  sources,
  owners,
  branches,
  section,
  onSaved,
  onCancel,
}: {
  initial?: ContactFormValues;
  sources: LookupValue[];
  owners: { id: string; full_name: string }[];
  branches: { id: string; name: string }[];
  /** When set, only this section is shown (the rest stay in the DOM so nothing is lost on save). */
  section?: ContactSection;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  // Keep every field in the DOM (so an untouched section still submits its
  // current value) but only reveal the section being edited.
  const hideCls = (k: ContactSection) => cn(section && section !== k && "hidden");
  const [roles, setRoles] = React.useState<string[]>(initial?.roles ?? ["buyer"]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (roles.length === 0) return setError("Pick at least one role.");
    setBusy(true);
    setError(null);
    setSaved(false);
    const f = new FormData(e.currentTarget);
    const values = {
      kind: String(f.get("kind")),
      title: String(f.get("title") ?? ""),
      first_name: String(f.get("first_name") ?? ""),
      last_name: String(f.get("last_name") ?? ""),
      company_name: String(f.get("company_name") ?? ""),
      salutation: String(f.get("salutation") ?? ""),
      email: String(f.get("email") ?? ""),
      email_secondary: String(f.get("email_secondary") ?? ""),
      phone: String(f.get("phone") ?? ""),
      mobile: String(f.get("mobile") ?? ""),
      work_phone: String(f.get("work_phone") ?? ""),
      website: String(f.get("website") ?? ""),
      address_line1: String(f.get("address_line1") ?? ""),
      address_line2: String(f.get("address_line2") ?? ""),
      town: String(f.get("town") ?? ""),
      county: String(f.get("county") ?? ""),
      postcode: String(f.get("postcode") ?? ""),
      roles,
      status: String(f.get("status") ?? ""),
      source_id: String(f.get("source_id") ?? "") || null,
      owner_id: String(f.get("owner_id") ?? "") || null,
      branch_id: String(f.get("branch_id") ?? "") || null,
      temperature: (String(f.get("temperature") ?? "") || null) as "hot" | "warm" | "cold" | null,
      notes: String(f.get("notes") ?? ""),
    };

    const res = initial?.id
      ? await updateContact({ id: initial.id, ...values })
      : await createContact(values);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    if (initial?.id) {
      setSaved(true);
      router.refresh();
      onSaved?.();
    } else {
      const created = res.data as { id: string } | undefined;
      router.push(created ? `/contacts/${created.id}` : "/contacts");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card className={hideCls("identity")}>
        <CardHeader title="Who they are" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Type" htmlFor="cf_kind">
            <Select id="cf_kind" name="kind" defaultValue={initial?.kind ?? "person"}>
              <option value="person">Person</option>
              <option value="organisation">Organisation</option>
            </Select>
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Roles</p>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_OPTIONS.map((r) => {
                const active = roles.includes(r.value);
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() =>
                      setRoles((rs) => (active ? rs.filter((x) => x !== r.value) : [...rs, r.value]))
                    }
                    className={
                      active
                        ? "rounded-full bg-ink px-3 py-1.5 text-[13px] font-semibold text-white"
                        : "rounded-full bg-surface-3 px-3 py-1.5 text-[13px] font-semibold text-fg-2 hover:text-fg-1"
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Title" htmlFor="cf_title">
            <Input id="cf_title" name="title" defaultValue={initial?.title ?? ""} placeholder="Dr" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" htmlFor="cf_first">
              <Input id="cf_first" name="first_name" defaultValue={initial?.first_name ?? ""} />
            </Field>
            <Field label="Last name" htmlFor="cf_last">
              <Input id="cf_last" name="last_name" defaultValue={initial?.last_name ?? ""} />
            </Field>
          </div>
          <Field label="Company name" htmlFor="cf_company">
            <Input id="cf_company" name="company_name" defaultValue={initial?.company_name ?? ""} />
          </Field>
          <Field label="Salutation" htmlFor="cf_salutation" hint="Used in letters and email greetings">
            <Input id="cf_salutation" name="salutation" defaultValue={initial?.salutation ?? ""} placeholder="Dr Smith" />
          </Field>
        </div>
      </Card>

      <Card className={hideCls("contact")}>
        <CardHeader title="Contact details" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="cf_email">
            <Input id="cf_email" name="email" type="email" defaultValue={initial?.email ?? ""} />
          </Field>
          <Field label="Secondary email" htmlFor="cf_email2">
            <Input id="cf_email2" name="email_secondary" type="email" defaultValue={initial?.email_secondary ?? ""} />
          </Field>
          <Field label="Mobile" htmlFor="cf_mobile">
            <Input id="cf_mobile" name="mobile" defaultValue={initial?.mobile ?? ""} />
          </Field>
          <Field label="Phone" htmlFor="cf_phone">
            <Input id="cf_phone" name="phone" defaultValue={initial?.phone ?? ""} />
          </Field>
          <Field label="Work phone" htmlFor="cf_work">
            <Input id="cf_work" name="work_phone" defaultValue={initial?.work_phone ?? ""} />
          </Field>
          <Field label="Website" htmlFor="cf_web">
            <Input id="cf_web" name="website" defaultValue={initial?.website ?? ""} />
          </Field>
        </div>
      </Card>

      <Card className={hideCls("address")}>
        <CardHeader title="Address" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Address line 1" htmlFor="cf_a1">
            <Input id="cf_a1" name="address_line1" defaultValue={initial?.address_line1 ?? ""} />
          </Field>
          <Field label="Address line 2" htmlFor="cf_a2">
            <Input id="cf_a2" name="address_line2" defaultValue={initial?.address_line2 ?? ""} />
          </Field>
          <Field label="Town" htmlFor="cf_town">
            <Input id="cf_town" name="town" defaultValue={initial?.town ?? ""} />
          </Field>
          <Field label="County" htmlFor="cf_county">
            <Input id="cf_county" name="county" defaultValue={initial?.county ?? ""} />
          </Field>
          <Field label="Postcode" htmlFor="cf_postcode" hint="Used to place this contact on the map for matching">
            <Input id="cf_postcode" name="postcode" defaultValue={initial?.postcode ?? ""} />
          </Field>
        </div>
      </Card>

      <Card className={hideCls("crm")}>
        <CardHeader title="CRM" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Owner" htmlFor="cf_owner">
            <Select id="cf_owner" name="owner_id" defaultValue={initial?.owner_id ?? ""}>
              <option value="">Unassigned</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>{o.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Branch" htmlFor="cf_branch">
            <Select id="cf_branch" name="branch_id" defaultValue={initial?.branch_id ?? ""}>
              <option value="">No branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Source" htmlFor="cf_source">
            <Select id="cf_source" name="source_id" defaultValue={initial?.source_id ?? ""}>
              <option value="">Unknown</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.value}</option>
              ))}
            </Select>
          </Field>
          <Field label="Temperature" htmlFor="cf_temp" hint="Lead heat — buyers only">
            <Select id="cf_temp" name="temperature" defaultValue={initial?.temperature ?? ""}>
              <option value="">Not set</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </Select>
          </Field>
          <Field label="Status" htmlFor="cf_status" className="sm:col-span-2">
            <Input id="cf_status" name="status" defaultValue={initial?.status ?? ""} placeholder="e.g. Active" />
          </Field>
          <Field label="Contact notes" htmlFor="cf_notes" className="sm:col-span-2">
            <Textarea id="cf_notes" name="notes" defaultValue={initial?.notes ?? ""} rows={4} />
          </Field>
        </div>
      </Card>

      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
      {saved ? <p className="text-sm font-medium text-available-fg">Saved.</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => (onCancel ? onCancel() : router.back())}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : initial?.id ? "Save changes" : "Create contact"}</Button>
      </div>
    </form>
  );
}
