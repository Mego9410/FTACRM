"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Avatar, Button, Card, CardHeader, EmptyState, Field, Select } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { ContactPicker, type PickedContact } from "@/components/record/contact-picker";
import { addContactLink, removeContactLink } from "./actions";

type LinkRow = {
  linkId: string;
  relationship: string;
  direction: "out" | "in";
  contactId: string;
  name: string;
  email: string | null;
};

const RELATIONSHIPS = ["Joint buyer", "Partner", "Spouse", "Accountant", "Solicitor", "Works at", "Colleague", "Other"];

export function RelatedClient({ contactId, links }: { contactId: string; links: LinkRow[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<PickedContact | null>(null);
  const [relationship, setRelationship] = React.useState(RELATIONSHIPS[0]!);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!picked) return setError("Search for a contact first.");
    setBusy(true);
    setError(null);
    const res = await addContactLink({
      contact_id: contactId,
      related_contact_id: picked.id,
      relationship,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    setPicked(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title={`Related contacts (${links.length})`}
        action={<Button size="sm" onClick={() => setOpen(true)}>Link contact</Button>}
      />
      {links.length === 0 ? (
        <EmptyState className="m-4" title="No related contacts" body="Link joint buyers, partners, accountants or colleagues." />
      ) : (
        <ul className="divide-y divide-line">
          {links.map((l) => (
            <li key={l.linkId} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={l.name} size={30} />
              <div className="min-w-0 flex-1">
                <Link href={`/contacts/${l.contactId}`} className="text-sm font-semibold text-fg-1 hover:underline">
                  {l.name}
                </Link>
                <p className="text-xs text-fg-3">
                  {l.direction === "out" ? l.relationship : `${l.relationship} (linked from their record)`}
                  {l.email ? ` · ${l.email}` : ""}
                </p>
              </div>
              <button
                type="button"
                title="Remove link"
                className="rounded p-1.5 text-fg-4 hover:bg-surface-3 hover:text-danger"
                onClick={async () => {
                  await removeContactLink({ id: l.linkId, contact_id: contactId });
                  router.refresh();
                }}
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Link a contact">
        <div className="space-y-4">
          {picked ? (
            <div className="flex items-center justify-between rounded-sm border border-line px-3 py-2">
              <span className="text-sm font-semibold text-fg-1">{picked.label}</span>
              <button type="button" onClick={() => setPicked(null)} className="text-fg-3 hover:text-danger">
                <X size={15} />
              </button>
            </div>
          ) : (
            <ContactPicker onPick={setPicked} autoFocus />
          )}
          <Field label="Relationship" htmlFor="rel_select">
            <Select id="rel_select" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={busy || !picked}>
              {busy ? "Linking…" : "Link"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </Card>
  );
}
