"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Settings2, Trash2, Plus } from "lucide-react";
import type { LookupValue } from "@/lib/lookups";
import type { ReferralCompany } from "@/lib/referrals";
import { Button, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import {
  addReferralCategory,
  addReferralCompany,
  removeReferralCategory,
  removeReferralCompany,
} from "@/lib/actions/referral-sources";

export function ReferralSourcesManager({
  categories,
  companies,
}: {
  categories: LookupValue[];
  companies: ReferralCompany[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [newCat, setNewCat] = React.useState("");
  const [newCo, setNewCo] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedCat = categories.find((c) => c.id === selected) ?? null;
  const companiesForSelected = companies.filter((c) => c.category_id === selected);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Something went wrong.");
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Settings2 size={14} /> Manage sources
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Manage referral sources" wide>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[13px] font-bold text-fg-1">Categories</p>
            <ul className="space-y-1">
              {categories.map((c) => (
                <li key={c.id}>
                  <div
                    className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm ${
                      selected === c.id ? "bg-gold-tint text-gold-deep" : "hover:bg-surface-2"
                    }`}
                  >
                    <button type="button" className="min-w-0 flex-1 truncate text-left font-medium" onClick={() => setSelected(c.id)}>
                      {c.value}
                    </button>
                    <button
                      type="button"
                      title="Remove category"
                      className="ml-2 shrink-0 text-fg-4 hover:text-danger"
                      onClick={() => {
                        if (window.confirm(`Remove the "${c.value}" category?`)) {
                          if (selected === c.id) setSelected(null);
                          void run(() => removeReferralCategory({ id: c.id }));
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-1.5">
              <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" />
              <Button
                type="button"
                size="sm"
                disabled={busy || !newCat.trim()}
                onClick={() => run(() => addReferralCategory({ name: newCat.trim() })).then(() => setNewCat(""))}
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-bold text-fg-1">
              {selectedCat ? `Companies in ${selectedCat.value}` : "Companies"}
            </p>
            {!selectedCat ? (
              <p className="text-sm text-fg-3">Pick a category to manage its companies.</p>
            ) : (
              <>
                <ul className="space-y-1">
                  {companiesForSelected.length === 0 ? (
                    <li className="text-sm text-fg-3">No companies yet.</li>
                  ) : (
                    companiesForSelected.map((co) => (
                      <li key={co.id} className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-surface-2">
                        <span className="min-w-0 flex-1 truncate">{co.name}</span>
                        <button
                          type="button"
                          title="Remove company"
                          className="ml-2 shrink-0 text-fg-4 hover:text-danger"
                          onClick={() => {
                            if (window.confirm(`Remove "${co.name}"?`)) void run(() => removeReferralCompany({ id: co.id }));
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                <div className="mt-2 flex gap-1.5">
                  <Input value={newCo} onChange={(e) => setNewCo(e.target.value)} placeholder="New company" />
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || !newCo.trim()}
                    onClick={() =>
                      run(() => addReferralCompany({ category_id: selectedCat.id, name: newCo.trim() })).then(() => setNewCo(""))
                    }
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
        {error ? <p className="mt-3 text-sm font-medium text-danger">{error}</p> : null}
      </Dialog>
    </>
  );
}
