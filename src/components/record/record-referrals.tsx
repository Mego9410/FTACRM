"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { LookupValue } from "@/lib/lookups";
import type { ReferralCompany, ReferralRow } from "@/lib/referrals";
import { Button, Card, CardHeader, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatGBP } from "@/lib/utils";
import { createReferral, deleteReferral } from "@/lib/actions/referrals";

const ADD_NEW = "__new__";

/**
 * Log referrals attached to a record (buyer/seller/practice). Any staff member
 * can add them here, drilling category → company (or adding a new company). The
 * back-end report reads them for the monthly figures.
 */
export function RecordReferrals({
  referrals,
  categories,
  companies,
  contactId,
  practiceId,
}: {
  referrals: ReferralRow[];
  categories: LookupValue[];
  companies: ReferralCompany[];
  contactId?: string;
  practiceId?: string;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [categoryId, setCategoryId] = React.useState("");
  const [companySel, setCompanySel] = React.useState(""); // "" | uuid | ADD_NEW
  const [newCompany, setNewCompany] = React.useState("");

  const companiesForCategory = companies.filter((c) => c.category_id === categoryId);

  function openForm() {
    setCategoryId("");
    setCompanySel("");
    setNewCompany("");
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!categoryId) return setError("Pick a referral type.");
    if (companySel === ADD_NEW && !newCompany.trim()) return setError("Enter the new company name.");
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const rawValue = String(f.get("value") ?? "").replace(/[,£\s]/g, "");
    const res = await createReferral({
      category_id: categoryId,
      company_id: companySel && companySel !== ADD_NEW ? companySel : null,
      new_company_name: companySel === ADD_NEW ? newCompany.trim() : null,
      referred_on: String(f.get("referred_on")),
      value: rawValue === "" ? null : Number(rawValue),
      note: String(f.get("note") ?? "") || null,
      contact_id: contactId ?? null,
      practice_id: practiceId ?? null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this referral?")) return;
    const res = await deleteReferral({ id });
    if (!res.ok) return window.alert(res.error);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title={`Referrals (${referrals.length})`}
        action={
          <Button size="sm" onClick={openForm} className="gap-1.5">
            <Plus size={14} /> Log referral
          </Button>
        }
      />
      {referrals.length === 0 ? (
        <EmptyState className="m-4" title="No referrals logged" body="Log a referral you've made for this record — it feeds the monthly figures." />
      ) : (
        <ul className="divide-y divide-line">
          {referrals.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-fg-1">{r.category_name ?? "Referral"}</span>
                  {r.company_name ? <span className="text-xs text-fg-2">· {r.company_name}</span> : null}
                  {r.value != null ? <span className="text-xs font-semibold text-gold-deep">{formatGBP(r.value)}</span> : null}
                  <span className="text-xs text-fg-3">{formatDate(r.referred_on)}</span>
                </div>
                {r.note ? <p className="mt-0.5 text-xs text-fg-3">{r.note}</p> : null}
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>Delete</Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Log referral">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Referral type" htmlFor="rf_cat">
            <Select
              id="rf_cat"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setCompanySel("");
                setNewCompany("");
              }}
              required
            >
              <option value="" disabled>Choose a type…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.value}</option>
              ))}
            </Select>
          </Field>

          {categoryId ? (
            <Field label="Company" htmlFor="rf_co" hint="Pick the exact company, or add a new one">
              <Select id="rf_co" value={companySel} onChange={(e) => setCompanySel(e.target.value)}>
                <option value="">Not specified</option>
                {companiesForCategory.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value={ADD_NEW}>+ Add a new company…</option>
              </Select>
            </Field>
          ) : null}

          {companySel === ADD_NEW ? (
            <Field label="New company name" htmlFor="rf_newco">
              <Input id="rf_newco" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="e.g. Smith & Co" autoFocus />
            </Field>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="rf_date">
              <Input id="rf_date" name="referred_on" type="date" defaultValue={today} required />
            </Field>
            <Field label="Value (£, optional)" htmlFor="rf_value" hint="Referral income, if known">
              <Input id="rf_value" name="value" inputMode="numeric" />
            </Field>
          </div>
          <Field label="Note (optional)" htmlFor="rf_note">
            <Textarea id="rf_note" name="note" rows={2} />
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Log referral"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </Card>
  );
}
