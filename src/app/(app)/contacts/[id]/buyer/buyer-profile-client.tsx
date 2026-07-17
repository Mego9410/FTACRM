"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, X } from "lucide-react";
import type { LookupValue } from "@/lib/lookups";
import { UK_REGIONS } from "@/lib/geo";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { addSearchArea, removeSearchArea, saveBuyerCriteria } from "./actions";

type Criteria = {
  min_price: number | null;
  max_price: number | null;
  specialism_ids: string[];
  deal_structure_ids: string[];
  funding_type_ids: string[];
  tenure_type_ids: string[];
  buyer_position_id: string | null;
  timescale: string | null;
  finance_status: string | null;
  min_surgeries: number | null;
  min_annual_turnover: number | null;
  notes: string | null;
} | null;

type Area = { id: string; label: string; region: string | null; radius_miles: number | null };

function ToggleGroup({
  label,
  options,
  selected,
  onChange,
  hint,
}: {
  label: string;
  options: LookupValue[];
  selected: string[];
  onChange: (ids: string[]) => void;
  hint?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-fg-1">{label}</p>
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
      {hint ? <p className="mt-1 text-xs text-fg-3">{hint}</p> : null}
    </div>
  );
}

export function BuyerProfileClient({
  contactId,
  criteria,
  areas,
  lookups,
}: {
  contactId: string;
  criteria: Criteria;
  areas: Area[];
  lookups: {
    specialisms: LookupValue[];
    structures: LookupValue[];
    fundings: LookupValue[];
    tenures: LookupValue[];
    positions: LookupValue[];
  };
}) {
  const router = useRouter();
  const [specialisms, setSpecialisms] = React.useState<string[]>(criteria?.specialism_ids ?? []);
  const [structures, setStructures] = React.useState<string[]>(criteria?.deal_structure_ids ?? []);
  const [fundings, setFundings] = React.useState<string[]>(criteria?.funding_type_ids ?? []);
  const [tenures, setTenures] = React.useState<string[]>(criteria?.tenure_type_ids ?? []);
  const [areaMode, setAreaMode] = React.useState<"place" | "region">("place");
  const [busy, setBusy] = React.useState(false);
  const [areaBusy, setAreaBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [areaError, setAreaError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const num = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").replace(/[,£\s]/g, "");
    return s === "" ? null : Number(s);
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const f = new FormData(e.currentTarget);
    const res = await saveBuyerCriteria({
      contact_id: contactId,
      min_price: num(f.get("min_price")),
      max_price: num(f.get("max_price")),
      specialism_ids: specialisms,
      deal_structure_ids: structures,
      funding_type_ids: fundings,
      tenure_type_ids: tenures,
      buyer_position_id: String(f.get("buyer_position_id") ?? "") || null,
      timescale: (String(f.get("timescale") ?? "") || null) as "asap" | "3m" | "6m" | "12m+" | null,
      finance_status: (String(f.get("finance_status") ?? "") || null) as
        | "cash"
        | "mortgage_agreed"
        | "mortgage_needed"
        | "unknown"
        | null,
      min_surgeries: num(f.get("min_surgeries")),
      min_annual_turnover: num(f.get("min_annual_turnover")),
      notes: String(f.get("notes") ?? "") || null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSaved(true);
    router.refresh();
  }

  async function submitArea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAreaBusy(true);
    setAreaError(null);
    const f = new FormData(e.currentTarget);
    const res = await addSearchArea({
      contact_id: contactId,
      mode: areaMode,
      place: String(f.get("place") ?? "") || undefined,
      radius_miles: Number(f.get("radius_miles") ?? 0) || undefined,
      region: String(f.get("region") ?? "") || undefined,
    });
    setAreaBusy(false);
    if (!res.ok) return setAreaError(res.error);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <form onSubmit={submit} className="space-y-5">
        <Card>
          <CardHeader title="What they're looking for" />
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum price (£)" htmlFor="bc_min">
                <Input id="bc_min" name="min_price" inputMode="numeric" defaultValue={criteria?.min_price ?? ""} placeholder="250,000" />
              </Field>
              <Field label="Maximum price (£)" htmlFor="bc_max">
                <Input id="bc_max" name="max_price" inputMode="numeric" defaultValue={criteria?.max_price ?? ""} placeholder="800,000" />
              </Field>
            </div>
            <ToggleGroup label="Funding" options={lookups.fundings} selected={fundings} onChange={setFundings} hint="Nothing selected = any" />
            <ToggleGroup label="Tenure" options={lookups.tenures} selected={tenures} onChange={setTenures} />
            <ToggleGroup label="Deal structure" options={lookups.structures} selected={structures} onChange={setStructures} />
            <ToggleGroup label="Specialisms" options={lookups.specialisms} selected={specialisms} onChange={setSpecialisms} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum surgeries" htmlFor="bc_surgeries">
                <Input id="bc_surgeries" name="min_surgeries" type="number" min={0} defaultValue={criteria?.min_surgeries ?? ""} />
              </Field>
              <Field label="Minimum turnover (£)" htmlFor="bc_turnover">
                <Input id="bc_turnover" name="min_annual_turnover" inputMode="numeric" defaultValue={criteria?.min_annual_turnover ?? ""} />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Their position" />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Buyer position" htmlFor="bc_position">
              <Select id="bc_position" name="buyer_position_id" defaultValue={criteria?.buyer_position_id ?? ""}>
                <option value="">Unknown</option>
                {lookups.positions.map((p) => (
                  <option key={p.id} value={p.id}>{p.value}</option>
                ))}
              </Select>
            </Field>
            <Field label="Timescale" htmlFor="bc_timescale">
              <Select id="bc_timescale" name="timescale" defaultValue={criteria?.timescale ?? ""}>
                <option value="">Unknown</option>
                <option value="asap">As soon as possible</option>
                <option value="3m">Within 3 months</option>
                <option value="6m">Within 6 months</option>
                <option value="12m+">12 months or more</option>
              </Select>
            </Field>
            <Field label="Finance" htmlFor="bc_finance">
              <Select id="bc_finance" name="finance_status" defaultValue={criteria?.finance_status ?? ""}>
                <option value="">Unknown</option>
                <option value="cash">Cash buyer</option>
                <option value="mortgage_agreed">Finance agreed</option>
                <option value="mortgage_needed">Finance needed</option>
              </Select>
            </Field>
            <Field label="Criteria notes" htmlFor="bc_notes" className="sm:col-span-3">
              <Textarea id="bc_notes" name="notes" defaultValue={criteria?.notes ?? ""} rows={3} />
            </Field>
          </div>
        </Card>

        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
        {saved ? <p className="text-sm font-medium text-available-fg">Criteria saved.</p> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save criteria"}</Button>
        </div>
      </form>

      <div>
        <Card>
          <CardHeader title="Search areas" />
          <div className="p-4">
            {areas.length === 0 ? (
              <p className="mb-3 text-sm text-fg-3">No areas yet — matching will ignore location until one is added.</p>
            ) : (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {areas.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-gold-tint px-3 py-1 text-[13px] font-semibold text-gold-deep">
                    <MapPin size={12} /> {a.label}
                    <button
                      type="button"
                      aria-label={`Remove ${a.label}`}
                      onClick={async () => {
                        await removeSearchArea({ id: a.id, contact_id: contactId });
                        router.refresh();
                      }}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-gold-tint-2"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="mb-3 flex gap-1.5">
              {(["place", "region"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAreaMode(m)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[13px] font-semibold capitalize",
                    areaMode === m ? "bg-ink text-white" : "bg-surface-3 text-fg-2",
                  )}
                >
                  {m === "place" ? "Town + radius" : "UK region"}
                </button>
              ))}
            </div>

            <form onSubmit={submitArea} className="space-y-3">
              {areaMode === "place" ? (
                <>
                  <Field label="Town or city" htmlFor="ba_place">
                    <Input id="ba_place" name="place" placeholder="Manchester" required />
                  </Field>
                  <Field label="Radius (miles)" htmlFor="ba_radius">
                    <Input id="ba_radius" name="radius_miles" type="number" min={1} max={200} defaultValue={20} required />
                  </Field>
                </>
              ) : (
                <Field label="Region" htmlFor="ba_region">
                  <Select id="ba_region" name="region" required>
                    {UK_REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Select>
                </Field>
              )}
              {areaError ? <p className="text-sm font-medium text-danger">{areaError}</p> : null}
              <Button type="submit" size="sm" className="w-full" disabled={areaBusy}>
                {areaBusy ? "Adding…" : "Add area"}
              </Button>
            </form>
            <p className="mt-3 text-xs text-fg-3">Areas combine with OR — a practice inside any of them matches.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
