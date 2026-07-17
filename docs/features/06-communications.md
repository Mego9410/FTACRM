# Phase 5 — Communications

Non-negotiables #2 and #3. Two pillars: **bulk campaigns via Resend** and **Microsoft 365
mailbox sync via Graph**. Setup steps for both providers: `docs/integrations.md`.

## 5.1 Bulk email campaigns (Resend)

### Segment builder
- Visual filter builder over contacts producing `segment_definition` jsonb: role,
  buyer criteria facets (specialism, funding, deal structure, tenure, price band, areas),
  temperature, status, owner, last-contacted, source, "matched to practice X".
- Live recipient count as filters change, with exclusion breakdown ("6,912 recipients ·
  184 excluded: 121 unsubscribed, 40 no consent, 23 no email").
- Alternative entry points: bulk-select on the contact list; Matching bulk action (pre-
  segmented to a selection + practice context).
- Segments savable as named audiences for reuse.

### Composer
- Template picker (or blank), subject, Tiptap editor with FTA-styled email shell (logo
  header, footer with company details + unsubscribe link — legally required).
- Merge tags panel by record context: `{{contact.first_name|there}}` (with fallback
  syntax), `{{practice.display_title}}`, `{{practice.asking_price}}`, `{{sender.name}}`…
  Confidentiality: practice tags in campaigns only expose marketing-safe fields.
- Preview mode with a real sampled recipient; **test send to self** button.
- Sender: fixed verified domain (e.g. `updates@mail.ft-associates.com`), display name +
  reply-to = the chosen agent.

### Dispatch
- Send now or schedule. On send: snapshot segment → `campaign_recipients` (re-checking
  suppressions + consent + `do_not_contact` at snapshot time), status `sending`.
- Cron `campaign-dispatch` drains queued recipients in batches (Resend batch API, 100/call)
  respecting rate limits; per-recipient merge-tag rendering; store `resend_message_id`.
- Failure isolation: a failed batch retries with backoff; individual hard failures mark the
  recipient `failed` without stopping the campaign. Campaign completes → owner notified.
- Scale note: 7,000 recipients ≈ 70 batch calls ≈ minutes. Design for 25k+ (the "expansion"
  requirement) — dispatch is already queue-based, so scale is a Resend plan change.

### Tracking & analytics (`/campaigns/[id]`)
- Resend webhook (`/api/webhooks/resend`, Svix signature verified) ingests delivered /
  opened / clicked / bounced / complained → `email_events`; rollup counters on campaign.
- Campaign dashboard: funnel tiles (sent → delivered → opened → clicked), open/click rates,
  per-link click table, bounce list with reasons, recipient-level table (searchable —
  "did John Smith open it?"). Opens/clicks also write compact journal entries on the
  contact.
- Hard bounce / complaint → auto-insert `suppressions`.

### Unsubscribe & compliance
- Every campaign email carries a tokenised unsubscribe link → public page (no login) →
  `suppressions` + `consent_email=false` + journal entry. Also honour Resend's
  list-unsubscribe header. Suppression checked at snapshot AND at dispatch.

## 5.2 Microsoft 365 mailbox sync (Graph)

### Connection
- Settings → "Connect Microsoft 365": per-user OAuth (delegated: `Mail.Read`, `Mail.Send`,
  `Calendars.ReadWrite`, `offline_access`). Store encrypted refresh token in
  `graph_connections`. Status card with reconnect/disconnect + last-sync.

### Inbound/outbound capture
- Subscribe to mailbox change notifications (`/api/webhooks/graph`, validation handshake +
  `clientState` check); cron renews subscriptions and runs delta-query catch-up.
- New messages → `email_messages` → match participants to contacts by email → journal
  entries (one per message-contact pair; deduped by `graph_message_id` across staff
  mailboxes). Auto-file to a practice/deal when unambiguous; otherwise a "file to…" action
  on the journal entry.
- Privacy: users can mark a message private (removes journal links); a per-user
  domain/address ignore list (e.g. personal threads); only messages involving known
  contacts are stored — the CRM never keeps unmatched mail beyond a transient window.

### One-to-one send from the CRM
- "Send email" on any contact/record: composer with templates + merge tags, sends **via the
  user's own mailbox** (Graph `sendMail`) so replies thread naturally in Outlook; message
  logged to journal immediately; replies captured by sync.

### Email tracker view (`/campaigns` sibling tab)
- Firm-wide sent-mail log: campaigns and tracked one-to-ones, filter by sender/date/status,
  read/unread toggles — replaces the old Email Tracker.

## 5.3 Letters & SMS

- **Letters**: template → merged PDF (server-side render, e.g. `@react-pdf/renderer`) →
  download or save to record documents. (Old Mail Merge, minus Word output.)
- **SMS**: schema supports `journal_entries.entry_type='sms'`; sending deferred — placeholder
  UI with "coming soon". (Twilio would slot in cleanly; not in current scope.)

## Acceptance criteria

- [ ] 7,000-recipient campaign: segment → preview → test send → dispatch completes;
      progress visible; counters accurate against Resend dashboard.
- [ ] Merge tags render with fallbacks; unit tests incl. confidentiality context.
- [ ] Unsubscribe round-trip verified; suppressed contact excluded from next snapshot.
- [ ] Webhook events land: open/click visible on campaign + contact journal.
- [ ] M365: connect, receive inbound from a known contact → journal entry appears; send
      one-to-one from record → lands in recipient inbox from the user's own address.
- [ ] Subscription renewal + delta catch-up survive a simulated 3-day webhook outage.
