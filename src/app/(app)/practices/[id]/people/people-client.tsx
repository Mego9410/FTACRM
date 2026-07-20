"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, X } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Select } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { ContactPicker, type PickedContact } from "@/components/record/contact-picker";
import { SortSelect, useClientSort } from "@/components/ui/sortable";
import { PRACTICE_ROLE_LABELS } from "@/lib/contact-helpers";
import { addPracticeContact, removePracticeContact, setPrimarySeller } from "../../actions";

type Person = {
  linkId: string;
  role: string;
  is_primary: boolean;
  notes: string | null;
  contactId: string;
  name: string;
  email: string | null;
  phone: string | null;
};

const SECTIONS: { title: string; roles: string[]; blurb: string }[] = [
  { title: "Sellers", roles: ["seller"], blurb: "The practice owners selling. Star one as primary." },
  { title: "Interested buyers", roles: ["buyer"], blurb: "Added automatically by viewings and offers, or by hand." },
  {
    title: "Solicitors & professionals",
    roles: ["seller_solicitor", "buyer_solicitor", "accountant", "other"],
    blurb: "Conveyancing and advisory contacts on this sale.",
  },
];

export function PeopleClient({ practiceId, people }: { practiceId: string; people: Person[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<PickedContact | null>(null);
  const [role, setRole] = React.useState("seller");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { sorted, key, dir, set } = useClientSort(
    people,
    {
      name: (p) => p.name,
      role: (p) => PRACTICE_ROLE_LABELS[p.role] ?? p.role,
      primary: (p) => !p.is_primary, // primary first when ascending
    },
    { key: "name", dir: "asc" },
  );

  async function submit() {
    if (!picked) return setError("Search for a contact first.");
    setBusy(true);
    setError(null);
    const res = await addPracticeContact({
      practice_id: practiceId,
      contact_id: picked.id,
      role,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    setPicked(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {people.length > 0 ? (
          <SortSelect
            options={[
              { key: "name", label: "Name" },
              { key: "role", label: "Role" },
              { key: "primary", label: "Primary first" },
            ]}
            sortKey={key}
            dir={dir}
            onChange={set}
          />
        ) : null}
        <Button size="sm" onClick={() => setOpen(true)}>Add person</Button>
      </div>

      {SECTIONS.map((section) => {
        const rows = sorted.filter((p) => section.roles.includes(p.role));
        return (
          <Card key={section.title}>
            <CardHeader title={`${section.title} (${rows.length})`} />
            {rows.length === 0 ? (
              <p className="px-5 py-5 text-sm text-fg-3">{section.blurb}</p>
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((p) => (
                  <li key={p.linkId} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={p.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/contacts/${p.contactId}`} className="text-sm font-semibold text-fg-1 hover:underline">
                          {p.name}
                        </Link>
                        <Badge tone="gold">{PRACTICE_ROLE_LABELS[p.role] ?? p.role}</Badge>
                        {p.is_primary ? (
                          <Badge className="gap-1"><Star size={10} className="fill-current" /> Primary</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-fg-3">{[p.email, p.phone].filter(Boolean).join(" · ") || "No contact details"}</p>
                    </div>
                    {p.role === "seller" && !p.is_primary ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await setPrimarySeller({ id: p.linkId, practice_id: practiceId });
                          router.refresh();
                        }}
                      >
                        Make primary
                      </Button>
                    ) : null}
                    <button
                      type="button"
                      title="Unlink"
                      className="rounded p-1.5 text-fg-4 hover:bg-surface-3 hover:text-danger"
                      onClick={async () => {
                        if (!window.confirm(`Unlink ${p.name} from this practice?`)) return;
                        await removePracticeContact({ id: p.linkId, practice_id: practiceId });
                        router.refresh();
                      }}
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}

      <Dialog open={open} onClose={() => setOpen(false)} title="Add person to practice">
        <div className="space-y-4">
          {picked ? (
            <div className="flex items-center justify-between rounded-sm border border-line px-3 py-2">
              <span className="text-sm font-semibold text-fg-1">{picked.label}</span>
              <button type="button" onClick={() => setPicked(null)} className="text-fg-3 hover:text-danger">
                <X size={15} />
              </button>
            </div>
          ) : (
            <ContactPicker onPick={setPicked} autoFocus placeholder="Search existing contacts…" />
          )}
          <Field label="Role on this practice" htmlFor="pp_role">
            <Select id="pp_role" value={role} onChange={(e) => setRole(e.target.value)}>
              {Object.entries(PRACTICE_ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-fg-3">
            Can't find them? <Link href="/contacts/new" className="font-semibold text-gold-deep hover:underline">Create the contact</Link> first, then link them here.
          </p>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={busy || !picked}>
              {busy ? "Linking…" : "Add"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
