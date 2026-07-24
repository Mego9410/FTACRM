"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { LookupValue } from "@/lib/lookups";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { createPractice, updatePractice } from "./actions";

export type PracticeFormValues = {
  id?: string;
  name: string | null;
  display_title: string;
  address_line1: string | null;
  address_line2: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  asking_price: number | null;
  price_prefix: string;
  funding_type_id: string | null;
  tenure_type_id: string | null;
  trading_entity_id: string | null;
  specialism_ids: string[];
  surgeries: number | null;
  annual_turnover: number | null;
  ebitda: number | null;
  reconstituted_profit: number | null;
  nhs_contract_value: number | null;
  udas: number | null;
  staff_count: number | null;
  established_year: number | null;
  description: string | null;
  instructed_at: string | null;
  lease_expiry: string | null;
  closing_date: string | null;
  fee_percent: number | null;
  fee_fixed: number | null;
  loa_issued_at: string | null;
  loa_received_at: string | null;
  loa_lapsed_at: string | null;
  sales_particulars_sent_at: string | null;
  being_updated: boolean | null;
  hd_paid: boolean | null;
};

function TogglePills({
  options,
  selected,
  onChange,
}: {
  options: LookupValue[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(active ? selected.filter((x) => x !== o.id) : [...selected, o.id])}
            className={cn(
              "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
              active ? "bg-ink text-white" : "bg-surface-3 text-fg-2 hover:text-fg-1",
            )}
          >
            {o.value}
          </button>
        );
      })}
    </div>
  );
}

export type PracticeSection = "identity" | "location" | "dental" | "pricing";

export function PracticeForm({
  initial,
  lookups,
  section,
  onSaved,
  onCancel,
}: {
  initial?: PracticeFormValues;
  lookups: {
    fundings: LookupValue[];
    tenures: LookupValue[];
    entities: LookupValue[];
    specialisms: LookupValue[];
  };
  /** When set, only this section is shown (the rest stay in the DOM so nothing is lost on save). */
  section?: PracticeSection;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  // Keep every field in the DOM (so an untouched section still submits its
  // current value) but only reveal the section being edited.
  const hideCls = (k: PracticeSection) => cn(section && section !== k && "hidden");
  const [specialisms, setSpecialisms] = React.useState<string[]>(initial?.specialism_ids ?? []);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const num = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").replace(/[,£\s]/g, "");
    return s === "" ? null : Number(s);
  };
  const intOrNull = (v: FormDataEntryValue | null) => {
    const n = num(v);
    return n === null ? null : Math.round(n);
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const f = new FormData(e.currentTarget);
    const values = {
      name: String(f.get("name") ?? ""),
      display_title: String(f.get("display_title") ?? ""),
      address_line1: String(f.get("address_line1") ?? ""),
      address_line2: String(f.get("address_line2") ?? ""),
      town: String(f.get("town") ?? ""),
      county: String(f.get("county") ?? ""),
      postcode: String(f.get("postcode") ?? ""),
      asking_price: num(f.get("asking_price")),
      price_prefix: String(f.get("price_prefix")) as "guide" | "offers_over" | "fixed" | "poa",
      funding_type_id: String(f.get("funding_type_id") ?? "") || null,
      tenure_type_id: String(f.get("tenure_type_id") ?? "") || null,
      trading_entity_id: String(f.get("trading_entity_id") ?? "") || null,
      specialism_ids: specialisms,
      surgeries: intOrNull(f.get("surgeries")),
      annual_turnover: num(f.get("annual_turnover")),
      ebitda: num(f.get("ebitda")),
      reconstituted_profit: num(f.get("reconstituted_profit")),
      nhs_contract_value: num(f.get("nhs_contract_value")),
      udas: intOrNull(f.get("udas")),
      staff_count: intOrNull(f.get("staff_count")),
      established_year: intOrNull(f.get("established_year")),
      description: String(f.get("description") ?? ""),
      instructed_at: String(f.get("instructed_at") ?? "") || null,
      lease_expiry: String(f.get("lease_expiry") ?? "") || null,
      closing_date: String(f.get("closing_date") ?? "") || null,
      fee_percent: num(f.get("fee_percent")),
      fee_fixed: num(f.get("fee_fixed")),
      loa_issued_at: String(f.get("loa_issued_at") ?? "") || null,
      loa_received_at: String(f.get("loa_received_at") ?? "") || null,
      loa_lapsed_at: String(f.get("loa_lapsed_at") ?? "") || null,
      sales_particulars_sent_at: String(f.get("sales_particulars_sent_at") ?? "") || null,
      being_updated: f.get("being_updated") === "on",
      hd_paid: f.get("hd_paid") === "on",
    };
    const res = initial?.id
      ? await updatePractice({ id: initial.id, ...values })
      : await createPractice(values);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    if (initial?.id) {
      setSaved(true);
      router.refresh();
      onSaved?.();
    } else {
      const created = res.data as { id: string } | undefined;
      router.push(created ? `/practices/${created.id}` : "/practices");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card className={hideCls("identity")}>
        <CardHeader title="Identity" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field
            label="Marketing title"
            htmlFor="pf_display"
            hint="Anonymised — what buyers see, e.g. “4-surgery mixed practice, Cheshire”"
            className="sm:col-span-2"
          >
            <Input id="pf_display" name="display_title" defaultValue={initial?.display_title ?? ""} required minLength={3} />
          </Field>
          <Field label="Trading name" htmlFor="pf_name" hint="Internal use only">
            <Input id="pf_name" name="name" defaultValue={initial?.name ?? ""} />
          </Field>
        </div>
      </Card>

      <Card className={hideCls("location")}>
        <CardHeader title="Location" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Address line 1" htmlFor="pf_a1">
            <Input id="pf_a1" name="address_line1" defaultValue={initial?.address_line1 ?? ""} />
          </Field>
          <Field label="Address line 2" htmlFor="pf_a2">
            <Input id="pf_a2" name="address_line2" defaultValue={initial?.address_line2 ?? ""} />
          </Field>
          <Field label="Town" htmlFor="pf_town">
            <Input id="pf_town" name="town" defaultValue={initial?.town ?? ""} />
          </Field>
          <Field label="County" htmlFor="pf_county">
            <Input id="pf_county" name="county" defaultValue={initial?.county ?? ""} />
          </Field>
          <Field label="Postcode" htmlFor="pf_postcode" hint="Drives area matching against buyer search areas">
            <Input id="pf_postcode" name="postcode" defaultValue={initial?.postcode ?? ""} />
          </Field>
        </div>
      </Card>

      <Card className={hideCls("dental")}>
        <CardHeader title="Dental profile" />
        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Funding" htmlFor="pf_funding">
              <Select id="pf_funding" name="funding_type_id" defaultValue={initial?.funding_type_id ?? ""}>
                <option value="">Not set</option>
                {lookups.fundings.map((v) => (
                  <option key={v.id} value={v.id}>{v.value}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tenure" htmlFor="pf_tenure">
              <Select id="pf_tenure" name="tenure_type_id" defaultValue={initial?.tenure_type_id ?? ""}>
                <option value="">Not set</option>
                {lookups.tenures.map((v) => (
                  <option key={v.id} value={v.id}>{v.value}</option>
                ))}
              </Select>
            </Field>
            <Field label="Trading entity" htmlFor="pf_entity">
              <Select id="pf_entity" name="trading_entity_id" defaultValue={initial?.trading_entity_id ?? ""}>
                <option value="">Not set</option>
                {lookups.entities.map((v) => (
                  <option key={v.id} value={v.id}>{v.value}</option>
                ))}
              </Select>
            </Field>
            <Field label="Lease expiry" htmlFor="pf_lease" hint="Leasehold practices — when the lease runs out">
              <Input id="pf_lease" name="lease_expiry" type="date" defaultValue={initial?.lease_expiry ?? ""} />
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Specialisms</p>
            <TogglePills options={lookups.specialisms} selected={specialisms} onChange={setSpecialisms} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Surgeries" htmlFor="pf_surgeries">
              <Input id="pf_surgeries" name="surgeries" type="number" min={0} defaultValue={initial?.surgeries ?? ""} />
            </Field>
            <Field label="UDAs" htmlFor="pf_udas">
              <Input id="pf_udas" name="udas" type="number" min={0} defaultValue={initial?.udas ?? ""} />
            </Field>
            <Field label="Staff" htmlFor="pf_staff">
              <Input id="pf_staff" name="staff_count" type="number" min={0} defaultValue={initial?.staff_count ?? ""} />
            </Field>
            <Field label="Established (year)" htmlFor="pf_established" hint="Year the practice was founded">
              <Input id="pf_established" name="established_year" type="number" min={1800} max={2100} placeholder="1895" defaultValue={initial?.established_year ?? ""} />
            </Field>
            <Field label="Annual turnover (£)" htmlFor="pf_turnover">
              <Input id="pf_turnover" name="annual_turnover" inputMode="numeric" defaultValue={initial?.annual_turnover ?? ""} />
            </Field>
            <Field label="EBITDA (£)" htmlFor="pf_ebitda">
              <Input id="pf_ebitda" name="ebitda" inputMode="numeric" defaultValue={initial?.ebitda ?? ""} />
            </Field>
            <Field label="Reconstituted profit (£)" htmlFor="pf_recon" hint="Adjusted net profit — % of turnover shown automatically">
              <Input id="pf_recon" name="reconstituted_profit" inputMode="numeric" defaultValue={initial?.reconstituted_profit ?? ""} />
            </Field>
            <Field label="NHS contract value (£)" htmlFor="pf_nhs">
              <Input id="pf_nhs" name="nhs_contract_value" inputMode="numeric" defaultValue={initial?.nhs_contract_value ?? ""} />
            </Field>
          </div>
          <Field label="Marketing description" htmlFor="pf_desc">
            <Textarea id="pf_desc" name="description" defaultValue={initial?.description ?? ""} rows={5} />
          </Field>
        </div>
      </Card>

      <Card className={hideCls("pricing")}>
        <CardHeader title="Price, fees and dates" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Asking price (£)" htmlFor="pf_price">
            <Input id="pf_price" name="asking_price" inputMode="numeric" defaultValue={initial?.asking_price ?? ""} />
          </Field>
          <Field label="Price basis" htmlFor="pf_prefix">
            <Select id="pf_prefix" name="price_prefix" defaultValue={initial?.price_prefix ?? "guide"}>
              <option value="guide">Guide price</option>
              <option value="offers_over">Offers over</option>
              <option value="fixed">Fixed</option>
              <option value="poa">POA</option>
            </Select>
          </Field>
          <div />
          <Field label="Fee %" htmlFor="pf_feepct">
            <Input id="pf_feepct" name="fee_percent" type="number" step="0.1" min={0} max={100} defaultValue={initial?.fee_percent ?? ""} />
          </Field>
          <Field label="Fixed fee (£)" htmlFor="pf_feefix">
            <Input id="pf_feefix" name="fee_fixed" inputMode="numeric" defaultValue={initial?.fee_fixed ?? ""} />
          </Field>
          <div />
          <Field label="Instructed" htmlFor="pf_instructed">
            <Input id="pf_instructed" name="instructed_at" type="date" defaultValue={initial?.instructed_at ?? ""} />
          </Field>
          <Field label="Best and final closing date" htmlFor="pf_closing" hint="Deadline for offers when running a closing-date process">
            <Input id="pf_closing" name="closing_date" type="date" defaultValue={initial?.closing_date ?? ""} />
          </Field>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-fg-3 sm:col-span-3">Pre-market tracking</p>
          <Field label="LoA issued" htmlFor="pf_loa_issued" hint="Letter of Authority sent">
            <Input id="pf_loa_issued" name="loa_issued_at" type="date" defaultValue={initial?.loa_issued_at ?? ""} />
          </Field>
          <Field label="LoA received" htmlFor="pf_loa_received">
            <Input id="pf_loa_received" name="loa_received_at" type="date" defaultValue={initial?.loa_received_at ?? ""} />
          </Field>
          <Field label="LoA lapsed" htmlFor="pf_loa_lapsed">
            <Input id="pf_loa_lapsed" name="loa_lapsed_at" type="date" defaultValue={initial?.loa_lapsed_at ?? ""} />
          </Field>
          <Field label="Sales particulars sent" htmlFor="pf_parts">
            <Input id="pf_parts" name="sales_particulars_sent_at" type="date" defaultValue={initial?.sales_particulars_sent_at ?? ""} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-fg-1">
            <input type="checkbox" name="being_updated" defaultChecked={initial?.being_updated ?? false} className="h-4 w-4 accent-[#E4AD25]" />
            Being updated
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-fg-1">
            <input type="checkbox" name="hd_paid" defaultChecked={initial?.hd_paid ?? false} className="h-4 w-4 accent-[#E4AD25]" />
            HD paid
          </label>
        </div>
      </Card>

      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
      {saved ? <p className="text-sm font-medium text-available-fg">Saved.</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => (onCancel ? onCancel() : router.back())}>Cancel</Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : initial?.id ? "Save changes" : "Create practice"}
        </Button>
      </div>
    </form>
  );
}
