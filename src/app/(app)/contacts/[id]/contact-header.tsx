"use client";

import * as React from "react";
import { ContactStatusControl } from "./contact-status-control";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Mail, Phone, Send, ShieldAlert } from "lucide-react";
import { Avatar, Badge, Button } from "@/components/ui/primitives";
import { RecordWarning } from "@/components/record/record-warning";
import { relativeTime } from "@/lib/utils";
import { archiveContact } from "../actions";

type HeaderContact = {
  id: string;
  ref: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  roles: string[];
  status: string | null;
  temperature: string | null;
  do_not_contact: boolean;
  consent_email: boolean | null;
  consent_updated_at: string | null;
  identity_verified: boolean;
  address_verified: boolean;
  last_contacted_at: string | null;
  archived_at: string | null;
  warning: string | null;
};

export function ContactHeader({
  contact,
  showIntroEmail = false,
}: {
  contact: HeaderContact;
  /** Buyer, and no introduction email sent yet — offer the shortcut. */
  showIntroEmail?: boolean;
}) {
  const router = useRouter();
  const consentUnset = contact.consent_updated_at === null;

  return (
    <div className="mb-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <RecordWarning table="contacts" id={contact.id} warning={contact.warning} bare />
        {showIntroEmail ? (
          <Link
            href={`/contacts/${contact.id}/intro`}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold-tint px-3 py-1.5 text-[13px] font-bold text-gold-deep transition-colors hover:bg-gold/20"
            title="Send this buyer their post-call introduction email"
          >
            <Send size={14} /> Introduction email
          </Link>
        ) : null}
      </div>
      {contact.do_not_contact ? (
        <div className="mb-3 flex items-center gap-2 rounded-sm border border-danger/30 bg-danger-bg px-4 py-2.5 text-sm font-semibold text-danger">
          <ShieldAlert size={16} /> Do not contact — this person is excluded from all communications.
        </div>
      ) : consentUnset ? (
        <div className="mb-3 flex items-center gap-2 rounded-sm border border-warn/30 bg-warn-bg px-4 py-2.5 text-sm font-semibold text-warn">
          <ShieldAlert size={16} /> GDPR preferences not set — record consent on the Details tab before emailing.
        </div>
      ) : null}
      {contact.archived_at ? (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-sm border border-line bg-surface-3 px-4 py-2.5 text-sm font-semibold text-fg-2">
          <span className="flex items-center gap-2"><Archive size={16} /> This contact is archived.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await archiveContact({ id: contact.id, archive: false });
              router.refresh();
            }}
          >
            Restore
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={contact.name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[30px] font-extrabold tracking-tight text-fg-1">{contact.name}</h1>
            {contact.roles.map((r) => (
              <Badge key={r} className="capitalize">{r}</Badge>
            ))}
            {contact.temperature ? (
              <Badge tone={contact.temperature === "hot" ? "danger" : contact.temperature === "warm" ? "gold" : "nhs"} className="capitalize">
                {contact.temperature}
              </Badge>
            ) : null}
            <ContactStatusControl id={contact.id} status={contact.status} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-fg-3">
            <span>{contact.ref}</span>
            {contact.email ? (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-gold-deep">
                <Mail size={13} /> {contact.email}
              </a>
            ) : null}
            {(contact.mobile ?? contact.phone) ? (
              <a href={`tel:${contact.mobile ?? contact.phone}`} className="inline-flex items-center gap-1 hover:text-gold-deep">
                <Phone size={13} /> {contact.mobile ?? contact.phone}
              </a>
            ) : null}
            <span>
              Last contacted {contact.last_contacted_at ? relativeTime(contact.last_contacted_at) : "never"}
            </span>
            <span className="inline-flex items-center gap-1">
              AML:{" "}
              <Badge tone={contact.identity_verified ? "green" : "neutral"}>
                ID {contact.identity_verified ? "verified" : "unverified"}
              </Badge>
              <Badge tone={contact.address_verified ? "green" : "neutral"}>
                Address {contact.address_verified ? "verified" : "unverified"}
              </Badge>
            </span>
          </p>
        </div>
        {!contact.archived_at ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (!window.confirm("Archive this contact? They stay searchable under archived filters.")) return;
              const res = await archiveContact({ id: contact.id, archive: true });
              if (!res.ok) window.alert(res.error);
              router.refresh();
            }}
          >
            <Archive size={14} /> Archive
          </Button>
        ) : null}
      </div>
    </div>
  );
}
