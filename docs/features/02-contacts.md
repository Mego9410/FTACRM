# Phase 1 — Contacts

One unified `contacts` entity covering buyers, sellers, solicitors, and everyone else —
role-discriminated, not separate tables (validated by how the old system worked).

## 1.1 List views (`/contacts`)

- Tabs: **All / Buyers / Sellers / Solicitors / Other** with live counts.
- DataTable columns (per role variant): name, company, email, phone, roles, status,
  temperature (buyers), owner, last contacted, created. Row click → record.
- Filters: role, status, owner, branch, temperature, source, consent flags, "not contacted
  in N days", has/lacks criteria (buyers). Free-text search (name/email/phone/company).
- Saved views hook-in (system smart lists arrive Phase 7, the filter → `saved_views`
  serialisation format is built now).
- Bulk select → actions: assign owner, add task, export CSV, (Phase 5: add to campaign).

## 1.2 Contact record (`/contacts/[id]`)

**Header**: avatar initials, name, primary role pills + status, temperature flame (buyers),
email/phone with click-to-copy, quick actions (log call, new note, new task, new event,
send email — disabled states until Phase 5/6), owner + branch selectors, ref.

**Warning strips**: missing consent ("GDPR preferences not set" → inline fix),
`do_not_contact`, unverified AML for sellers in live deals.

**Tabs**:
- **Details** — personal info, addresses (postcode lookup via getaddress.io or
  postcodes.io + manual edit; geocode to `location`), salutation, source, org link
  (person ↔ firm), contact notes (rich text), GDPR consent block (per-channel toggles +
  timestamps), AML block for sellers/buyers (identity/address verified + evidence doc link).
- **Buyer profile** (only when role includes buyer) — buyer criteria + search areas editor
  (full spec in `04-matching.md`), buyer status, position, finance status.
- **Practices** — practices this contact is linked to via `practice_contacts`, with role
  pill (seller/buyer/solicitor) and status; link/unlink actions.
- **Journal** — the activity timeline (below).
- **Documents** — upload (drag-drop), categorise, preview, download; list w/ search.
- **Checklist** — instantiate from template or ad hoc; check off items (who/when recorded).
- **Related contacts** — `contact_links` (joint buyer, partner, accountant…).
- **Audit** — field-level history.

## 1.3 Journal (shared component — spec here, reused on practices & deals)

- Composer at top: type selector (Call / Note), rich-text body, call fields when type=call
  (direction, outcome lookup, duration), occurred-at (defaults now, backdatable), save.
- Timeline: reverse-chronological, avatar + author + type icon + relative time, expandable
  body, linked-record chips (when viewing a contact, an entry also linked to a practice
  shows the practice chip and vice-versa), pin-to-top, edit/delete own entries (admin: any).
- Filters: type, author, date range, search.
- System entries (status changes, stage changes, campaign sends) render muted/compact.
- Email entries appear from Phase 5 (synced mail) — the type enum and rendering slots are
  built now.
- Logging a call/note updates `last_contacted_at`.

## 1.4 GDPR

- Consent block per contact; bulk "request preferences" tooling later (Phase 5).
- **Erasure routine** (admin action, double-confirm): anonymise PII in place — name →
  "Erased contact", null email/phones/address/notes, delete documents, scrub journal bodies,
  keep aggregate rows (offers/deals) with anonymised references. Log to audit.
- `do_not_contact` hard-blocks inclusion in any send and shows a banner on the record.

## Acceptance criteria

- [ ] Create/edit each contact role; person↔organisation linking works.
- [ ] Log calls and notes; timeline filters work; last-contacted updates.
- [ ] Documents upload/download with signed URLs; checklist instantiates from a template.
- [ ] 10,000 seeded contacts: list interactions and search stay sub-second.
- [ ] Erasure routine anonymises a contact and passes an audit spot-check.
