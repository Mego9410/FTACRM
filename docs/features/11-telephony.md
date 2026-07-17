# Phase 8b — AI call capture (3CX)

Connects FTA's 3CX cloud phone system to the CRM: calls auto-log to the journal, recordings
are transcribed, and AI analysis proposes follow-up tasks (with due dates) and a draft
follow-up email. Extends Phase 8 and inherits its principles wholesale: **assistive, never
autonomous** — the AI proposes, a human approves. No task is created and no email is sent
without an explicit user action. Every AI call logged to `ai_jobs`; graceful degradation at
every step (a failed transcription still leaves a logged call).

Depends on: Phase 1 (contacts + journal), Phase 6 (tasks + notifications), Phase 8 (AI
infrastructure, 8.2 action extraction, 8.3 drafting). Build after Phase 8.

## Pipeline

```
3CX (cloud) call ends
  │  call-journaling POST → /api/webhooks/3cx        (primary, push)
  │  cron poll of 3CX call history via XAPI           (safety net, mirrors graph-delta-sync)
  ▼
match external number → contacts (E.164 on phone/mobile/work_phone)
  ▼
journal_entries (entry_type='call', direction, duration) + call_recordings row (pending)
  ▼
cron telephony-recording-fetch: pull recording via 3CX XAPI → Storage bucket call-recordings
  ▼
Deepgram (EU endpoint): diarised en-GB transcript → call_recordings.transcript
  ▼
lib/ai analysis (ai_jobs kind=summarise_call): summary + outcome + proposed tasks + draft email
  ▼
journal entry updated; owner notified "Call analysed — review suggestions"
  ▼
user reviews on the record: accept/edit/dismiss tasks · open draft in composer · nothing auto-sent
```

## 8b.1 Call capture

- **Webhook** `app/api/webhooks/3cx/route.ts`: 3CX's server-side CRM integration template
  posts call-journaling data on call end (parties, direction, extension, start/end, call id,
  recording flag). Verify a shared-secret header (`THREECX_WEBHOOK_SECRET`), Zod-validate,
  then process server-side — same conventions as the Resend/Graph webhooks.
- **Safety-net poll**: the `telephony-sync` cron pulls recent call history from the 3CX
  XAPI (REST, OAuth2 client credentials — API key created in the 3CX Admin Console) so
  missed webhooks never lose calls. Webhooks are primary; poll is catch-up — the same
  pattern as `graph-delta-sync`.
- **Idempotency**: `call_recordings.provider_call_id` (the 3CX call id) is unique; retried
  webhooks and poll overlap never duplicate journal entries.
- **Scope**: external calls only (inbound + outbound); internal extension-to-extension
  calls are ignored. Calls under a configurable minimum duration (default 10s) log without
  AI processing.

## 8b.2 Contact matching

- Normalise both sides to E.164 (`lib/telephony/normalise.ts`, unit-tested: +44 forms,
  07… mobiles, spaces/dashes, international) and match against `contacts.phone`, `mobile`,
  `work_phone`.
- Exactly one match → journal entry on that contact; auto-file to practice/deal when the
  contact has exactly one live practice link (same rule as email sync, §5.2).
- Multiple matches → log against the most recently contacted candidate, flag "verify
  contact" on the entry with a one-click switch.
- No match → the call still logs to a firm-wide **unmatched calls** queue (number, time,
  direction, extension) with "link to contact / create contact / dismiss" actions —
  mirrors the email "file to…" pattern. Unmatched call recordings are kept only for a
  transient window (default 30 days) then deleted, consistent with the unmatched-mail rule.
- The staff member on the call is resolved from the 3CX extension → `profiles` mapping
  (admin-editable in Control Centre) and becomes the journal entry's author.

## 8b.3 Recording retrieval & transcription

- `telephony-recording-fetch` cron (every 5 min): for `call_recordings` rows with
  `transcript_status='pending'`, fetch the recording file from the 3CX XAPI (recordings
  aren't always available the instant a call ends), store it in the private
  `call-recordings` bucket, then submit to **Deepgram** (pre-recorded API, `en-GB`,
  diarisation on) via `lib/transcription/`. Bounded retry window (1 hour) → then mark
  `failed`: the call remains logged from webhook metadata alone, no AI features shown for
  it. Vendor is wrapped in `lib/transcription/` so it can swap (fallback: Azure AI Speech,
  UK South) — verify Deepgram's EU-hosted endpoint at account setup for data residency.
- Transcript stored diarised ("Agent:" / "Caller:") on `call_recordings.transcript`.
  Playback of the recording via signed URL from the journal entry.

## 8b.4 AI call analysis

On transcript ready, run one `ai_jobs` job (`kind='summarise_call'`, reasoning model) with
the same prompt-builder conventions as 8.2 — the transcript simply replaces the manual
call note as input. Structured output:

- **Summary** — outcome, key points, commitments made by each side; written into the
  journal entry body with an "AI-generated from recording" label. Suggested
  `call_outcome_id` (connected/voicemail/…) applied from call metadata + transcript.
- **Proposed tasks** — title, details, suggested `due_at` parsed from spoken commitments
  ("I'll send the accounts by Friday" → task due Friday, Europe/London). Rendered as
  pending suggestions on the journal entry — nothing exists in `tasks` until the user
  accepts (accept/edit/dismiss per item). Accepted tasks are attributed "via AI, approved
  by {user}" — identical to the 8.2 flow.
- **Draft follow-up email** — when the transcript warrants one and the contact has an
  email address: an FTA-voice draft recapping the call and confirming next steps. Surfaced
  as an "Open draft follow-up" action → pre-fills the one-to-one composer (§5.2) for
  editing; sent via the user's own Graph mailbox only when they press send. Never
  auto-sent; confidential practice fields excluded by the same context builder as 8.3.

Suggestions expire quietly if dismissed or untouched after 14 days. The call owner gets a
notification (kind: call analysed) when analysis completes.

## 8b.5 Compliance & privacy (UK)

- **Recording notification**: callers must be informed calls may be recorded — configured
  in 3CX (announcement/IVR prompt), an admin setup step in `docs/integrations.md`, not app
  code. Confirm before enabling the integration.
- **Retention**: recordings + transcripts covered by the GDPR erasure routine (anonymising
  a contact deletes their recordings and transcripts, keeps aggregate stats). Configurable
  retention period for audio (default 12 months; transcript retained with the journal).
- **Residency**: audio stored in Supabase Storage (London); transcription via Deepgram's
  EU endpoint (verified at setup).
- **Sensitivity**: call audio is more sensitive than typed notes. Baseline RLS (all staff
  read) applies to transcripts/summaries like any journal content, but **recording
  playback** is permission-gated (`telephony.play_recordings` in `role_permissions`) —
  a deliberate admin decision, not a silent default.
- Staff can mark a call private (removes journal links, restricts to author + admin) —
  same affordance as private email.

## 8b.6 Failure & degradation

Every stage fails soft, in line with Phase 8's principle:
- 3CX webhook down → poll cron catches up; nothing lost.
- Recording unavailable/fetch fails → call logged without transcript; no AI UI shown.
- Deepgram outage → rows stay `pending` within the retry window, then `failed`; retryable
  manually from the journal entry.
- Anthropic outage → transcript saved; analysis retried by the existing AI job handling;
  "Tidy with AI" (8.2) remains available manually.
- Sync errors surface through the existing `notifications` kind: sync errors (admin).

## Acceptance criteria

- [ ] Inbound and outbound external calls appear on the correct contact's journal within
      minutes, with direction, duration, and extension-resolved author.
- [ ] Replayed/duplicate webhooks and poll overlap create zero duplicate entries
      (idempotency test on `provider_call_id`).
- [ ] Number normalisation unit-tested (+44/0 forms, formatting noise, international).
- [ ] Unmatched call → queue → link-to-contact flow works; unlinked recordings purge after
      the transient window.
- [ ] Recording plays from the journal via signed URL, gated by
      `telephony.play_recordings`.
- [ ] Transcript produced for a test call; AI summary claims traceable to the transcript
      (same spot-check harness as 8.1).
- [ ] Proposed tasks require explicit accept; accepted tasks attributed "via AI, approved
      by {user}"; draft follow-up opens in the composer and is never auto-sent.
- [ ] Erasure routine removes a contact's recordings and transcripts.
- [ ] Each failure mode (no recording, transcription failure, AI outage) leaves a clean
      logged call with no broken UI.
