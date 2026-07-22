/**
 * Pure helpers for attributing an inherited journal entry to the record it was
 * originally written on. A note logged against a practice should surface on the
 * linked sellers/buyers (and vice-versa) tagged with where it came from; these
 * functions decide that tag without touching the database.
 */

export type EntryOrigin = { kind: string; label: string; href: string };

export type EntryLink = {
  contact_id: string | null;
  practice_id: string | null;
  deal_id: string | null;
};

export type OriginMaps = {
  /** The record currently being viewed — its own entries are never attributed. */
  primary: { contactId?: string | null; practiceId?: string | null; dealId?: string | null };
  practices: Map<string, EntryOrigin>;
  contacts: Map<string, EntryOrigin>;
  deals: Map<string, EntryOrigin>;
};

/** Derive the "Seller / Buyer / Solicitor / Contact" label from a contact's roles. */
export function originKindForRoles(roles: string[]): string {
  if (roles.includes("seller")) return "Seller";
  if (roles.includes("buyer")) return "Buyer";
  if (roles.some((r) => r.includes("solicitor"))) return "Solicitor";
  return "Contact";
}

/**
 * Returns the origin for an entry, or null when it belongs to the record being
 * viewed (native) or can't be attributed to a known linked record.
 */
export function resolveOrigin(e: EntryLink, maps: OriginMaps): EntryOrigin | null {
  const { primary } = maps;
  if (primary.practiceId && e.practice_id === primary.practiceId) return null;
  if (primary.contactId && e.contact_id === primary.contactId) return null;
  if (primary.dealId && e.deal_id === primary.dealId) return null;
  if (e.practice_id && maps.practices.has(e.practice_id)) return maps.practices.get(e.practice_id)!;
  if (e.contact_id && maps.contacts.has(e.contact_id)) return maps.contacts.get(e.contact_id)!;
  if (e.deal_id && maps.deals.has(e.deal_id)) return maps.deals.get(e.deal_id)!;
  return null;
}
