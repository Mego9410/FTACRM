# Data model

Complete Postgres schema. Migrations in `supabase/migrations/` are the source of truth; this
document is the design reference. All tables get `id uuid pk default gen_random_uuid()`,
`created_at timestamptz default now()`, `updated_at timestamptz` (trigger-maintained) unless
noted. RLS enabled on everything (see `architecture.md`).

Extensions: `pg_trgm`, `pgcrypto`, `unaccent`, `citext`.

> **Build note:** the implementation replaced the planned PostGIS `geography` columns with
> plain `lat`/`lng` doubles plus a `haversine_miles()` SQL function (and the same pure
> function in `src/lib/matching/`). Identical behaviour at FTA's scale, one less extension
> to operate, and fully testable on vanilla Postgres. References to `geography(point)`
> below should be read as `lat double precision, lng double precision`.

---

## 1. People & org

### `profiles` — staff users (1:1 with `auth.users`)
| column | type | notes |
|---|---|---|
| id | uuid pk | = `auth.users.id` |
| full_name | text | |
| email | text | |
| role | text | `admin` \| `manager` \| `agent` |
| calendar_color | text | hex, for calendar overlays |
| avatar_url | text | |
| is_active | bool | deactivated staff keep history, lose access |
| must_change_password | bool | set when an admin creates the account; the app forces a password change on first sign-in, then clears it |
| signature_html | text | email signature |

> `role`, `is_active` and `must_change_password` are privileged columns — a
> trigger blocks self-service updates to them (migrations 0021 + 0023); only
> server-side admin actions (service role) or direct DB connections may change
> them.

### `role_permissions`
`role text`, `permission text`, unique(role, permission). Seeded matrix (e.g.
`campaigns.send`, `deals.edit`, `admin.lookups`, `contacts.delete`, `reports.view`).
`lib/permissions.ts` reads this; admin UI edits it.

---

## 2. Lookups (admin-editable taxonomy — build first)

### `lookup_types`
`key text unique` (e.g. `specialism`), `label`, `is_system bool` (system types can't be
deleted, values still editable).

### `lookup_values`
| column | type | notes |
|---|---|---|
| lookup_type_id | uuid fk | |
| value | text | display label |
| sort_order | int | |
| is_active | bool | deactivate, never delete (referenced by records) |
| color | text nullable | for pills (e.g. funding types) |

Seeded lookup types + starting values:
- `specialism` — General, Endodontist, Hygienist, Implantologist, Oral Surgeon, Orthodontist, Periodontist, Prosthodontist, Paediatric
- `funding_type` — NHS, Private, Mixed  (pill colours: blue / green / magenta per design system)
- `tenure_type` — Freehold, Leasehold, Freehold or Leasehold, Mixed
- `contact_source` — Website, Referral, Event, Cold call, Portal, Other
- `buyer_position` — First-time buyer, Existing owner, Corporate/group, Investor
- `buyer_status` — Active, Passive, Under offer, Completed, Not proceeding
- `practice_status` — (see practices; system lookup, fixed keys + editable labels)
- `offer_status` — Pending, Accepted, Declined, Withdrawn, Fallen through
- `event_type` — Meeting, Valuation, Viewing, Call, Holiday, Webinar, Other (with colours)
- `document_category` — Contract, Accounts, ID/AML, Marketing, Correspondence, Other
- `task_category`, `journal_call_outcome`, `withdrawal_reason`, `fall_through_reason`

---

## 3. Contacts

### `contacts` — unified person/organisation record
| column | type | notes |
|---|---|---|
| ref | text unique | `C-000123`, sequence-generated |
| kind | text | `person` \| `organisation` |
| title, first_name, last_name | text | |
| company_name | text | for orgs (corporate buyers, solicitor firms) |
| salutation | text | for letters/merge |
| email | citext | indexed; used for M365 mail matching |
| email_secondary | citext | |
| phone, mobile, work_phone | text | |
| website | text | |
| address_line1/2, town, county, postcode, country | text | |
| location | geography(point) nullable | geocoded from postcode, for matching |
| roles | text[] | any of `buyer`, `seller`, `solicitor`, `other` — a person can be several |
| status | text | per-role status via lookups; primary status shown in header |
| source_id | uuid fk lookup_values | |
| temperature | text | `hot` \| `warm` \| `cold` (buyers) |
| notes | text | rich-text contact notes |
| organisation_id | uuid fk contacts nullable | person → parent org (e.g. solicitor → firm) |
| gdpr fields | | `consent_email bool`, `consent_sms bool`, `consent_phone bool`, `consent_letter bool`, `consent_updated_at`, `do_not_contact bool` |
| aml fields | | `identity_verified bool`, `identity_verified_at`, `address_verified bool` (sellers/buyers, AML/KYC) |
| last_contacted_at | timestamptz | maintained by journal trigger |
| archived_at | timestamptz | |

Indexes: trigram on (first_name, last_name, company_name) for search-as-you-type; btree on
email, roles (GIN), postcode.

### `buyer_criteria` — 1:1 with contact (buyers), drives matching
| column | type | notes |
|---|---|---|
| contact_id | uuid fk unique | |
| min_price, max_price | numeric(12,2) | |
| specialism_ids | uuid[] | lookup refs (OR) |
| funding_type_ids | uuid[] | |
| tenure_type_ids | uuid[] | |
| buyer_position_id | uuid fk lookup_values | |
| timescale | text | e.g. `asap`, `3m`, `6m`, `12m+` |
| finance_status | text | `cash`, `mortgage_agreed`, `mortgage_needed`, `unknown` |
| min_surgeries | int | replaces "min bedrooms" — surgery/chair count |
| min_annual_turnover | numeric(12,2) nullable | |
| notes | text | |

### `buyer_search_areas` — many per buyer (OR logic)
`contact_id fk`, `label text` (e.g. "Manchester"), `center geography(point)`,
`radius_miles numeric(5,2)`, or `region text` (named UK region as alternative to point+radius).

### `contact_links` — relationships between contacts
`contact_id`, `related_contact_id`, `relationship text` (e.g. `joint_buyer`, `partner`,
`accountant`, `works_at`). Replaces the old "Linked Applicants".

---

## 4. Practices (listings)

### `practices`
| column | type | notes |
|---|---|---|
| ref | text unique | `P-2026-0142` |
| name | text | trading name; the public listing page hard-hides it regardless |
| display_title | text | anonymised marketing title, e.g. "4-surgery mixed practice, Cheshire" |
| address fields + location geography(point) | | |
| status | text | `valuation` \| `preparing` \| `available` \| `under_offer` \| `sold_stc` \| `completed` \| `withdrawn` — system lookup |
| asking_price | numeric(12,2) | |
| price_prefix | text | `guide`, `offers_over`, `fixed`, `poa` |
| funding_type_id | uuid fk lookup_values | NHS / Private / Mixed |
| tenure_type_id | uuid fk lookup_values | |
| specialism_ids | uuid[] | |
| surgeries | int | number of surgeries/chairs |
| annual_turnover, ebitda, nhs_contract_value | numeric(12,2) nullable | financials for marketing + matching |
| udas | int nullable | NHS UDA count |
| staff_count | int nullable | |
| description | text | marketing copy (rich text) |
| headline_image_path | text nullable | uploaded headline photo (Storage `documents` bucket, signed URL per load). When null the UI shows a generated England & Wales map with a pin at lat/lng — `lib/uk-map.ts` (offline-baked paths + shared projection) + `components/practices/practice-map.tsx` |
| instructed_at | date | |
| contract_expiry | date | agency agreement expiry (drives "contracts expiring" smart list) |
| lease_expiry | date | leasehold practices — when the lease runs out (0010) |
| closing_date | date | best-and-final offers deadline when running a closing-date process (0010) |
| fee_percent, fee_fixed | numeric | agency fee |
| withdrawn_at, withdrawal_reason_id | | |
| archived_at | timestamptz | |

### `practice_contacts` — sellers/buyers/solicitors logged to a practice ★ non-negotiable #1
| column | type | notes |
|---|---|---|
| practice_id | uuid fk | |
| contact_id | uuid fk | |
| role | text | `seller` \| `buyer` \| `seller_solicitor` \| `buyer_solicitor` \| `accountant` \| `other` |
| is_primary | bool | one primary seller shown in header |
| notes | text | |
| unique(practice_id, contact_id, role) | | |

A practice typically has 1–2 sellers from instruction, gains interested buyers via viewings/
offers, and the accepted buyer + both solicitors when a deal forms.

### `valuations` (old "appraisals")
`practice_id fk`, `valuer_ids uuid[]`, `appointment_at timestamptz`, `duration_mins`,
`booked bool`, `confirmed bool`, `price_from`, `price_to`, `seller_expectation`,
`suggested_price`, `fee_percent/fee_fixed`, `outcome text` (`instructed`, `declined`,
`pending`), `notes`, `calendar_event_id fk nullable`.

### `viewings`
`practice_id fk`, `buyer_contact_id fk`, `scheduled_at`, `duration_mins`, `status`
(`requested`, `confirmed`, `completed`, `cancelled`, `no_show`), `accompanied_by uuid fk
profiles`, `feedback text`, `feedback_requested_at`, `calendar_event_id fk nullable`.

### `offers`
`practice_id fk`, `buyer_contact_id fk`, `amount numeric(12,2)`, `status_id fk lookup_values`,
`offer_date date`, `conditions text`, `finance_status text`, `accepted_at`, `declined_reason`,
`created_by fk profiles`. Accepting an offer (server action) sets practice → `under_offer` and
creates the `deal`.

### `practice_media`
`practice_id`, `storage_path`, `kind` (`photo`, `floorplan`, `video`, `doc`), `caption`,
`sort_order`, `is_confidential bool`.

### `enquiries`
`practice_id fk nullable`, `contact_id fk nullable`, `source`, `message`, `received_at`,
`handled_by`, `status` (`new`, `in_progress`, `closed`), `converted_to_contact bool`. Inbound
interest from website/portals; convertible into a buyer + criteria.

---

## 5. Deals (sales progression) ★ non-negotiable #4

### `deal_stages` — configurable stage definitions
`key text unique`, `label`, `sort_order`, `is_terminal bool`. Seeded with the standard 7:
1. `offer_accepted` 2. `solicitors_instructed` 3. `searches_ordered` 4. `finance_offer`
5. `searches_back` 6. `contracts_exchanged` 7. `completion`
(Admin can rename/add; existing deals keep their history.)

### `deals`
| column | type | notes |
|---|---|---|
| ref | text unique | `D-2026-0091` |
| practice_id | uuid fk | |
| offer_id | uuid fk | the accepted offer |
| buyer_contact_id, seller_contact_id | uuid fk | **snapshot** — the parties at the moment the deal formed (copied from the accepted offer / primary seller by `acceptOffer`). Intentionally frozen, not kept in step with the live contact links. |
| agreed_price | numeric(12,2) | |
| status | text | `in_progress` \| `completed` \| `fallen_through` \| `on_hold` |
| current_stage_id | uuid fk deal_stages | |
| target_completion_date | date | |
| fall_through_reason_id, fell_through_at | | on fall-through: practice back to `available` |
| completed_at | date | |
| last_activity_at | timestamptz | journal-trigger maintained; drives stalled-deal scan |

> Solicitors and other advisers are **not** stored on the deal. They live once on
> `practice_contacts` (roles `buyer_solicitor` / `seller_solicitor` / `accountant`);
> the deal's People tab reads them from there so there is a single home per fact.

### `deal_stage_events`
`deal_id`, `stage_id`, `achieved_on date`, `recorded_by`, `note`. Insert-only history — the
tracker renders from this (green = achieved w/ date, amber = current, grey = upcoming).

---

## 6. Shared record modules

### `journal_entries` ★ non-negotiable #2
| column | type | notes |
|---|---|---|
| entry_type | text | `call` \| `note` \| `email` \| `sms` \| `system` \| `file` |
| body | text | rich text; for emails, rendered snippet |
| subject | text nullable | |
| author_id | uuid fk profiles nullable | null for system entries |
| contact_id | uuid fk nullable | ≥1 of these three links set |
| practice_id | uuid fk nullable | |
| deal_id | uuid fk nullable | |
| call_outcome_id | uuid fk lookup_values nullable | connected / voicemail / no answer… |
| call_direction | text nullable | `inbound` \| `outbound` |
| email_message_id | uuid fk email_messages nullable | for synced/sent mail |
| pinned | bool | pin key notes to top |
| occurred_at | timestamptz default now() | backdatable |

Indexes on (contact_id, occurred_at desc), (practice_id, …), (deal_id, …), (author_id, …).
Trigger updates `contacts.last_contacted_at` / `deals.last_activity_at`.

### `documents`
`storage_path`, `file_name`, `mime_type`, `size_bytes`, `category_id fk lookup_values`,
`contact_id/practice_id/deal_id` (nullable links), `uploaded_by`. Private bucket, signed URLs.

### `call_recordings` (phase 8b — see `features/11-telephony.md`)
| column | type | notes |
|---|---|---|
| journal_entry_id | uuid fk journal_entries unique | 1:1 with the call's journal entry |
| provider_call_id | text unique | 3CX call id — idempotency key for webhook/poll dedupe |
| external_number | text | E.164; kept for unmatched-call queue + re-matching |
| extension | text | 3CX extension → resolved to `profiles` via admin mapping |
| duration_seconds | int | |
| recording_storage_path | text nullable | `call-recordings` bucket (private, signed URLs) |
| transcript | text nullable | diarised (Agent/Caller) |
| transcript_status | text | `pending` \| `fetched` \| `transcribed` \| `failed` \| `none` |
| retrieved_at, transcribed_at | timestamptz nullable | |

Kept separate from `journal_entries` so the timeline table stays lean (same idea as
`documents`). Recording playback gated by `role_permissions` (`telephony.play_recordings`);
recordings/transcripts included in the GDPR erasure routine. Unmatched calls (no contact
link on the journal entry) purge their recordings after a transient window.

### `checklist_templates` / `checklist_template_items`
Template: `name`, `applies_to` (`contact` | `practice` | `deal` | `valuation`), `is_active`.
Items: `label`, `sort_order`, `is_required`.

### `checklist_instances` / `checklist_items`
Instance: `template_id`, record link (contact/practice/deal/valuation id), `name`. Items:
`label`, `sort_order`, `checked bool`, `checked_by`, `checked_at`, `due_date nullable`.
Header shows "X of Y checked".

### `audit_log` (insert-only)
`table_name`, `record_id`, `field`, `old_value text`, `new_value text`, `changed_by`,
`changed_at`. Written by the `audit()` helper inside server actions (explicit, not a blanket
trigger — keeps noise out and lets us label fields in UI terms). Paginated, searchable per
record; admin-wide view in Control Centre.

### `tasks`
`title`, `details`, `due_at`, `assignee_id fk profiles`, `created_by`, `status` (`open`,
`done`, `cancelled`), `category_id`, record links (contact/practice/deal nullable),
`completed_at`. Surfaces on My Day and record pages.

### `notifications`
`profile_id`, `kind`, `title`, `body`, `link_url`, `read_at`. Realtime-subscribed bell menu.
Kinds: task due, deal stalled, campaign finished, mention, viewing feedback due, sync errors.

---

## 7. Communications ★ non-negotiables #2 & #3

### `email_templates`
`name`, `scope` (`campaign` | `one_to_one` | `system`), `subject`, `body_html` (Tiptap JSON +
rendered HTML), `record_context` (`buyer` | `seller` | `practice` | `deal` — governs available
merge tags), `created_by`, `is_active`. Merge tags: `{{contact.first_name}}`,
`{{practice.display_title}}`, `{{practice.asking_price}}`, `{{sender.name}}`, etc. —
documented and unit-tested in `lib/merge-tags/`.

### `campaigns`
| column | type | notes |
|---|---|---|
| name | text | internal |
| status | text | `draft` \| `scheduled` \| `sending` \| `sent` \| `cancelled` |
| subject, body_html | | from template or ad hoc |
| segment_definition | jsonb | serialized filter (roles, criteria, lookups, areas, temperature, last-contacted…) |
| from_profile_id | uuid fk | sender identity (name + signature); actual From is the verified campaign domain with reply-to the agent |
| scheduled_at, started_at, completed_at | timestamptz | |
| recipient_count, sent_count, delivered_count, open_count, click_count, bounce_count, unsubscribe_count | int | rolled up from events |
| practice_id | uuid fk nullable | "new instruction" campaigns link the practice |
| created_by | | |

### `campaign_recipients`
`campaign_id`, `contact_id`, `email` (frozen at send), `status` (`queued`, `sent`,
`delivered`, `bounced`, `suppressed`, `failed`), `resend_message_id text` indexed,
`sent_at`. Populated by snapshotting the segment at send time (minus suppressions).

### `email_events`
`campaign_recipient_id fk nullable`, `email_message_id fk nullable`, `event` (`delivered`,
`opened`, `clicked`, `bounced`, `complained`, `unsubscribed`), `occurred_at`, `meta jsonb`
(url clicked, bounce reason). Fed by the Resend webhook; rollups update campaign counters and
write journal entries for opens/clicks on tracked one-to-one mail.

### `suppressions`
`email citext unique`, `reason` (`unsubscribed`, `hard_bounce`, `complaint`, `manual`,
`gdpr`), `source_campaign_id nullable`, `created_at`. Checked at every dispatch. Public
unsubscribe page (tokenised link) inserts here + flips `contacts.consent_email`.

### `intro_email_blocks` / `intro_emails` — one-to-one introduction emails
Separate from the campaigns/launches pipeline by design: a plain, natural-language follow-up an
agent sends to a single buyer after a phone call, not a marketing send (no branded shell, no
unsubscribe footer). `intro_email_blocks` (`label`, `body`, `sort_order`, `is_active`) is the
admin-managed library of tickable introductions (Control Centre → Intro email blocks) — e.g. FTA
Finance, the CQC registration contact, recommended solicitors. `intro_emails` (`contact_id`,
`subject`, `body_text`, `block_labels text[]`, `sent_by`, `sent_at`) logs each send; a matching
`journal_entries` row is also written. Composed from a contacts/[id]/intro tab on buyer contacts.

### `graph_connections` — per-user Microsoft 365 link
`profile_id unique`, `ms_user_id`, `email`, `refresh_token_enc bytea` (pgcrypto),
`scopes text[]`, `mail_delta_token text`, `calendar_delta_token text`, `mail_subscription_id`,
`calendar_subscription_id`, `subscription_expires_at`, `status` (`active`, `error`,
`disconnected`), `last_synced_at`, `last_error`.

### `email_messages` — synced + CRM-sent mail
| column | type | notes |
|---|---|---|
| graph_message_id | text | unique per mailbox |
| profile_id | uuid fk | whose mailbox |
| direction | text | `inbound` \| `outbound` |
| from_email, to_emails text[], cc_emails text[] | | |
| subject | text | |
| body_preview | text | |
| body_html | text nullable | fetched on demand for full view |
| sent_at | timestamptz | |
| matched | bool | linked to ≥1 contact |
| is_private | bool default false | user can unlink/mark private; hidden from journals |

Matching: on sync, join participants' addresses against `contacts.email/email_secondary`; for
each match create a `journal_entries` row (`entry_type='email'`) on the contact — and on the
practice/deal when the contact has exactly one live practice link (else leave for manual
filing via a "file to…" action). Dedupe by `graph_message_id` so multiple staff on the same
thread don't duplicate journal spam: one journal entry per (message, contact).

---

## 8. Calendar ★ non-negotiable #5

### `calendar_events`
| column | type | notes |
|---|---|---|
| title | text | |
| event_type_id | uuid fk lookup_values | colour source |
| starts_at, ends_at | timestamptz | |
| all_day | bool | |
| location | text | |
| body | text | |
| organiser_id | uuid fk profiles | |
| practice_id / contact_id / deal_id | nullable fks | record linking (valuations & viewings auto-create linked events) |
| visibility | text | `normal` \| `private` (private syncs busy-time only) |
| recurrence | jsonb nullable | repeat rule `{freq: daily\|weekly\|monthly, interval, byday?[0-6], end: never\|on{date}\|after{count}}`. Expanded to occurrences within the requested window by `lib/calendar/recurrence.ts` (unit-tested); the stored row is the series anchor. |
| reminder_minutes | int[] | minutes-before-start reminder offsets (multiple allowed); empty = none |
| status | text | `confirmed` \| `tentative` \| `cancelled` |
| graph_event_id | text nullable | per-organiser Outlook copy |
| sync_state | text | `pending_push` \| `synced` \| `pull_only` \| `error` |
| external_source | text nullable | `outlook` for events pulled from Outlook (read-mostly in CRM) |

### `calendar_event_attendees`
`event_id`, `profile_id nullable`, `contact_id nullable`, `response` (`none`, `accepted`,
`declined`, `tentative`).

### `holiday_requests` — staff annual-leave requests
| column | type | notes |
|---|---|---|
| profile_id | uuid fk profiles | the requester |
| start_date, end_date | date | inclusive range; `end_date >= start_date` enforced |
| start_portion, end_portion | text | `full` \| `am` \| `pm` — half-day support on each boundary; single-day requests keep both equal. Day totals via `holidayDays()` in `lib/holiday-utils.ts` (unit-tested) |
| reason | text nullable | optional note from the requester |
| status | text | `pending` \| `approved` \| `rejected` \| `cancelled` |
| decision_note | text nullable | management's note — the "why" on a decline (or an approval comment) |
| decided_by | uuid fk profiles | who approved/declined |
| decided_at | timestamptz | |
| calendar_event_id | uuid fk calendar_events on delete set null | the all-day event created on approval (event type `holiday`, organiser = requester); cleared/removed on cancel |

Unlike the ordinary business tables (permissive RLS + server-action gating), this table is
**RLS-restricted**: a row is readable only by the requester or an admin/manager (mirrors the
`notifications` / `graph_connections` precedent). Server actions add the finer gate — only
management may decide; a requester may only cancel their own request. Approving a request
inserts the calendar event so leave shows on the team diary; declining stores the note that's
surfaced back to the requester. A decision can be **revised** later (change the outcome and/or
note) — the linked calendar event is created or removed to match. UI: `/holidays` (my requests)
and Control Centre → Holiday (`/admin/holidays`, the approval queue).

Two-way sync rules (detail in `features/07-calendar.md`): CRM-created events push to the
organiser's Outlook via Graph; Outlook-created/edited events pull via delta + webhook;
`graph_event_id` + iCalUId dedupe; last-writer-wins on conflicts with an audit entry.

---

## 9. Reporting, views, AI

### `saved_views` (smart lists / activity lists)
`name`, `entity` (`contacts`, `practices`, `deals`, `campaigns`), `definition jsonb`
(filters/sort/columns), `owner_id nullable` (null = shared/system), `sort_order`,
`show_on_dashboard bool`, `cached_count int`, `cached_at`. System-seeded lists: Contracts
expiring, Buyers not contacted, Valuations awaiting outcome, Viewings needing feedback,
Pending offers, Stalled deals, Unmatched new buyers.

### `report_snapshots` (optional, phase 7)
Nightly aggregates for fast period-vs-period KPI queries: `date`, `metric`, `value`.
Rebuildable from source tables. (Not built — reporting computes live.)

### `ai_jobs`
`kind` (`summarise_record`, `summarise_call`, `draft_email`, `draft_campaign`, `nl_search`,
`classify_email`, `deal_risk`, `meeting_brief`), `status` (`queued`, `running`, `done`,
`error`), `input jsonb`, `output jsonb`, `model`, `input_tokens`, `output_tokens`,
`requested_by`, record links, `created_at`, `completed_at`. Every AI call is logged here —
cost tracking + reproducibility.

### `ai_summaries`
`record kind + id`, `summary text`, `generated_at`, `journal_watermark timestamptz` (regenerate
only when new journal entries exist past the watermark), `model`.

---

## 10. Migration staging (phase 9)

`staging.*` schema mirroring iamproperty CSV exports (`staging.properties`,
`staging.vendors`, `staging.applicants`, `staging.journal`, …) with `raw jsonb`, mapping
outcome columns (`mapped_id uuid`, `mapping_status`, `issues text[]`). Transform jobs read
staging → write production tables; validation report queries compare counts/spot checks. See
`features/10-migration.md`.

---

## 11. Entity relationship sketch

```
profiles (staff)
contacts >──< practices  via practice_contacts (role: seller/buyer/solicitor…)
contacts 1─1 buyer_criteria ──< buyer_search_areas
practices ──< valuations / viewings / offers / practice_media / enquiries
offers 1─1 deals >── deal_stage_events >── deal_stages
contacts/practices/deals ──< journal_entries / documents / tasks / checklist_instances / audit_log
journal_entries 1─1 call_recordings   (entry_type='call', via 3CX)
campaigns ──< campaign_recipients ──< email_events
profiles 1─1 graph_connections ──< email_messages
calendar_events ──< calendar_event_attendees
```
