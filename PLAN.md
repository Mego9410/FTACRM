# FTA CRM — Master Build Plan

A ground-up CRM for **Frank Taylor & Associates (FTA)**, the UK's leading independent dental
practice sales agency. This replaces iamproperty — an off-the-shelf estate-agency CRM repurposed
for practice brokerage — with a system designed around **FTA and its clients**, not the property
market.

This document is the entry point. Read it fully before writing code, then work through the
numbered feature specs in `docs/features/` phase by phase.

---

## 1. Document map

| Document | Contents |
|---|---|
| `PLAN.md` (this file) | Vision, terminology, stack, build phases, definition of done |
| `docs/architecture.md` | System architecture, project structure, conventions, security model |
| `docs/data-model.md` | Complete Postgres schema — every table, column, index, and RLS approach |
| `docs/features/01-foundations.md` | Scaffold, auth, users, roles, branches, admin Control Centre, lookups |
| `docs/features/02-contacts.md` | Unified contact model — buyers, sellers, solicitors; journal, documents, checklists, audit |
| `docs/features/03-practices.md` | The Practice (listing) record — sellers/buyers linked, appraisals, viewings, offers |
| `docs/features/04-matching.md` | Buyer criteria + bidirectional matching engine with bulk actions |
| `docs/features/05-sales-progression.md` | Deal pipeline: 7-stage tracker, board and list views |
| `docs/features/06-communications.md` | Bulk email campaigns (Resend), M365 email sync, templates, tracking, GDPR |
| `docs/features/07-calendar.md` | Shared team calendar + two-way Outlook sync, tasks, notifications |
| `docs/features/08-reporting.md` | KPI dashboard, activity feed, saved lists / smart views |
| `docs/features/09-ai-features.md` | Anthropic API features: summarisation, drafting, NL search, deal-risk flags |
| `docs/features/10-migration.md` | iamproperty data migration: export mapping, import tooling, validation |
| `docs/integrations.md` | Setup for Supabase, Vercel, Resend, Microsoft Graph, Anthropic — env vars & DNS |
| `docs/design.md` | Applying the FTA design system inside the app UI |
| `docs/reference/` | Legacy CRM feature inventory, rebuild brief, ~90 screenshots of the old system |
| `design-system/` | FTA brand tokens, components.css, icons, assets, UI kit |

The legacy reference docs describe **what the old system did** — they are context, not a spec.
Where this plan and the legacy inventory disagree, **this plan wins**.

---

## 2. Product vision

FTA brokers the sale of dental practices in England and Wales: valuing practices, listing them
confidentially, matching them to a vetted buyer pool (7,000+ and growing), negotiating offers,
and driving deals through legal completion. The CRM is the operational core for ~26 staff across
sales, progression, and admin.

### Non-negotiables (from the business)

1. **Log seller and buyer profiles against a practice** (the "property").
2. **Manage call notes and emails** per contact and per practice.
3. **Bulk email to specific categories of buyers** — 7,000+ recipients, built to scale.
4. **Track deal status of a practice** — sales progression through to completion.
5. **Company-wide calendar management.**

### Deliberate improvements over the old system

- **First-class dental taxonomy** — `specialism`, `deal_structure`, `funding_type`,
  `tenure_type` as named, admin-editable fields instead of repurposed real-estate slots.
- **No vestigial real-estate features** — no Rooms, EPC, Council Tax, Alarm, portal syndication.
- **Modern communications** — tracked bulk campaigns with segments and suppression, plus real
  Microsoft 365 mailbox sync so email lands on the record automatically.
- **AI throughout** (Anthropic API) — call summarisation, record catch-ups, drafting, natural
  language search, stalled-deal detection. Always human-in-the-loop.
- **Fast** — the old system crawled under 420 live deals and thousands of contacts. Target
  sub-second interactions on lists of 10,000+ rows.

### Terminology — leaving the property market behind

| Old (iamproperty) | New (FTA CRM) | DB entity |
|---|---|---|
| Property | **Practice** | `practices` |
| Vendor | **Seller** | `contacts` (role: seller) |
| Applicant | **Buyer** | `contacts` (role: buyer) |
| Solicitor | Solicitor | `contacts` (role: solicitor) |
| Negotiator | **Agent** (assigned staff) | `profiles` |
| Sales Progression | **Deal** | `deals` |
| Appraisal | **Valuation** | `valuations` |

UI copy always uses the new terms. Sentence case everywhere, per the design system.

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15+ (App Router), TypeScript strict** | Server Components + Server Actions for mutations |
| Hosting | **Vercel** | Preview deploys per PR; Vercel Cron for scheduled jobs |
| Database | **Supabase Postgres** (London region `eu-west-2` for UK data) | Migrations via Supabase CLI, checked into `supabase/migrations/` |
| Auth | **Supabase Auth** | Email+password to start; Azure AD (Microsoft) SSO as fast-follow |
| Storage | **Supabase Storage** | Documents, practice photos, campaign images |
| Realtime | **Supabase Realtime** | Notifications, live deal-board updates |
| Styling | **Tailwind CSS v4** + FTA design tokens | Tokens imported from `design-system/colors_and_type.css` |
| Components | **shadcn/ui**, restyled to FTA brand | See `docs/design.md` |
| Data fetching | Server Components + **TanStack Query** for interactive client views | |
| Tables | **TanStack Table** + virtualisation for 10k+ row lists | |
| Rich text | **Tiptap** | Notes, email composer, templates |
| Email sending | **Resend** | Campaigns + transactional; webhooks for opens/clicks/bounces |
| Email/calendar sync | **Microsoft Graph API** | Per-user OAuth; mail delta sync + two-way calendar sync |
| AI | **Anthropic API** | `claude-sonnet-5` for reasoning tasks, `claude-haiku-4-5` for cheap/high-volume tasks |
| Validation | **Zod** everywhere (forms, server actions, API routes, webhooks) | |
| Testing | **Vitest** (unit) + **Playwright** (e2e) | CI via GitHub Actions |
| Geo | Postgres **PostGIS** (Supabase extension) | Area + radius buyer matching |

Repo: `mego9410/ftacrm`, deployed from `main` via Vercel Git integration.

---

## 4. Build phases

Work through phases in order; each phase ends with the acceptance criteria met, tests green, and
a deployable `main`. Detailed specs live in the numbered docs.

### Phase 0 — Scaffold & foundations (`docs/features/01-foundations.md`)
Next.js + Tailwind + Supabase wiring, design tokens applied, base layout (nav shell, global
search stub), auth (sign in, protected routes), `profiles`, `branches`, roles + permissions,
Control Centre skeleton, **lookups system** (admin-editable picklists — build this first, nearly
every later feature depends on it), audit-log plumbing, CI pipeline.

**Done when:** a user can sign in, see the branded shell, and an admin can manage users,
branches, and lookup values. Deployed on Vercel with Supabase migrations reproducible.

### Phase 1 — Contacts (`docs/features/02-contacts.md`)
Unified `contacts` entity with roles (buyer / seller / solicitor / other), full record page with
tab layout, journal (calls / notes / system events), documents, checklists, field-level audit
trail, GDPR consent block, list views with search/filter/sort at 10k-row scale.

**Done when:** staff can create and manage all contact types, log calls/notes, attach files, and
every field change is auditable.

### Phase 2 — Practices (`docs/features/03-practices.md`)
`practices` record: details + dental taxonomy, **linked seller(s) and buyer(s)**, valuations,
viewings, offers, marketing info, media, documents, journal, checklist, audit. Practice list +
search. Status lifecycle (Valuation → Available → Under Offer → Sold → Completed / Withdrawn).

**Done when:** non-negotiable #1 works end to end — a practice holds seller and buyer profiles,
with a full activity history.

### Phase 3 — Deals / sales progression (`docs/features/05-sales-progression.md`)
`deals` created on offer acceptance; 7-stage tracker (Offer accepted → Solicitors instructed →
Searches ordered → Mortgage offer → Searches back → Contracts exchanged → Completion) with stage
dates, board + list views, filters, stalled-deal indicators, fall-through handling.

**Done when:** non-negotiable #4 works — the whole firm's pipeline is visible and filterable,
and every stage change is dated and audited.

### Phase 4 — Matching (`docs/features/04-matching.md`)
Buyer criteria (areas + radius, price range, specialism, deal structure, funding, tenure,
timescale), bidirectional match views (practice → buyers, buyer → practices) with match scoring,
and bulk actions on selections (email, book viewing, add task).

**Done when:** selecting a practice surfaces ranked matching buyers and a bulk email can be sent
to a selection.

### Phase 5 — Communications (`docs/features/06-communications.md`)
The largest phase. Bulk email campaigns via Resend (segment builder over buyer categories,
template editor with merge tags, test send, batched dispatch, open/click/bounce webhooks,
unsubscribe + suppression list); email templates; **Microsoft 365 mailbox sync** (per-user OAuth,
inbound/outbound mail auto-logged to matching contact/practice journals); one-to-one send from
the record via Graph; email tracker view.

**Done when:** non-negotiables #2 and #3 work — a 7,000-recipient campaign can be segmented,
sent, and tracked; and staff mailboxes auto-file correspondence onto records.

### Phase 6 — Calendar & tasks (`docs/features/07-calendar.md`)
Shared team calendar (month/week/day), colour-coded event types, per-teammate show/hide, event ↔
record linking (valuations, viewings, meetings), **two-way Outlook sync** via Graph
subscriptions, tasks with due dates surfacing on My Day, in-app notifications.

**Done when:** non-negotiable #5 works — the whole team's calendars are visible in one place and
stay in sync with Outlook both directions.

### Phase 7 — Reporting & dashboards (`docs/features/08-reporting.md`)
My Day personal dashboard; management KPI dashboard (period-vs-period: instructions, gross
sales, pipeline fees/units, average fee %, average sale price, sliceable by branch/agent);
firm-wide activity feed; saved smart lists (e.g. "Buyers not contacted 90 days", "Deals with no
update 14 days"); CSV export.

**Done when:** leadership can answer "how are we doing vs last quarter" without leaving the CRM.

### Phase 8 — AI features (`docs/features/09-ai-features.md`)
Anthropic-powered: call-note summarisation + action extraction, record catch-up summaries, email
& campaign drafting in FTA voice, natural-language search, stalled-deal risk flags, inbound
email classification, meeting prep briefs.

**Done when:** each shipped AI feature is opt-in-visible, clearly labelled, editable before any
send, and degrades gracefully when the API is unavailable.

### Phase 9 — Migration & go-live (`docs/features/10-migration.md`)
Import tooling for iamproperty exports (contacts, practices, offers, deals, journals),
field-mapping layer translating repurposed real-estate slots into first-class taxonomy,
dedupe pass, validation report, dry-run mode, cutover checklist.

**Done when:** legacy data lives in the new CRM, spot-checked against the old system, and the
team has cut over.

---

## 5. Cross-cutting requirements (every phase)

- **Audit** — every business-field change writes to `audit_log` (old value, new value, user,
  timestamp). Built once in Phase 0, used everywhere.
- **Journal** — calls, notes, emails, SMS-placeholder, and system events share one
  `journal_entries` model, attachable to contacts, practices, and deals.
- **Performance** — server-side pagination + filtering on all lists; virtualised rendering;
  indexes defined in `docs/data-model.md`. Never fetch unbounded collections.
- **GDPR** — per-channel consent on contacts, unsubscribe honoured everywhere, right-to-erasure
  anonymisation routine, UK-region data residency.
- **Security** — RLS on every table; role checks in server actions; secrets server-side only;
  Graph tokens encrypted at rest. See `docs/architecture.md`.
- **Empty states** — every list/tab gets a designed empty state with a primary action, per the
  design system's calm editorial tone. No emoji, sentence case, gold accents.
- **Testing** — unit tests for matching, merge-tag rendering, campaign batching, migration
  mapping; Playwright smoke flows per phase (sign in → create → verify).

## 6. Definition of done (project)

1. All five non-negotiables demonstrably working in production.
2. Legacy data migrated and validated.
3. All 26 users onboarded with correct roles; admin can self-serve lookups, templates,
   checklists, and users without developer help.
4. Lighthouse performance ≥ 90 on key views; p95 list interactions < 1s at production data volume.
5. CI green: typecheck, lint, unit, e2e smoke.
6. `docs/` updated to match what was actually built.
