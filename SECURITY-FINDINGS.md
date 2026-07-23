# FTA CRM — Security Findings Register (Phase 1, read-only)

**Audit date:** 2026-07-23 · **Branch:** `security-audit` · **Scope:** white-box, static. No source modified. No dynamic testing against any environment.

> **Read this first.** One Confirmed **Critical** collapses the entire role model: any signed-in user can make themselves `admin` with a single direct API call (SEV-CRITICAL-01). Everything else is secondary to fixing that. The good news: RLS is enabled on all 47 tables, there is no HTML-injection sink, OAuth token handling is correct, and no secrets are committed.

---

## Stack — corrected against the code

Your brief was wrong on two points; the rest is confirmed:

| Claimed | Actual (per code) |
|---|---|
| Cloudflare R2 for documents | **Supabase Storage**, private bucket `documents`, served via short-lived signed URLs. No R2. |
| Resend for email | **Resend is a stub** — `getEmailProvider()` always returns `NotConfiguredProvider`; nothing sends today. Dispatch/segment code exists but is dormant. |
| Supabase (Postgres/Auth/Storage/RLS) | Confirmed. |
| Anthropic Claude | Confirmed (`src/lib/ai/client.ts`). |
| Third-party speech-to-text | **Deepgram**, fed by a **3CX telephony webhook**. |
| (not mentioned) | **Microsoft 365 / Graph OAuth** for mail/calendar sync (dormant until configured). |

---

## A. Inventory

### Roles & intended authorization model (the most important thing to write down)

Three roles on `profiles.role` (`check in ('admin','manager','agent')`, default `agent`):

- **agent** — the baseline. Intended: read/write day-to-day CRM data (contacts, practices, deals, tasks, calendar, journals). Not intended to reach Reporting or the Control Centre.
- **manager** — agent + the **Reporting** area (`/reporting/*`).
- **admin** — everything, including the **Control Centre** (`/admin/*`): invite users, set roles, edit the permission matrix, lookups, branches, checklists, intro blocks; play call recordings.

Fine-grained permissions (`role_permissions` table, admin-editable) gate specific actions: `deals.edit`, `contacts.delete`, `contacts.erase`, `campaigns.send`, `telephony.play_recordings`. **admins implicitly hold all permissions** (`permissions.ts:19`).

**How it is *intended* to be enforced** (stated verbatim in `migrations/0003:350-352`): *"FTA is one firm — authenticated staff read/write business data; role-gated behaviour is enforced in server actions."* i.e. the database deliberately lets any authenticated staffer read/write all business rows (RLS = `using(true) to authenticated`), and role separation is applied **only in server actions and page loaders**.

**How it is *actually* enforced:** the browser holds the Supabase **anon key + the user's JWT** and can call **PostgREST directly**, bypassing every server action. Because RLS is `using(true)`, the server-action gates are the *only* enforcement and they are trivially skippable. This gap is the source of SEV-CRITICAL-01 and SEV-HIGH-03.

### Routes / pages

- **Public (no session)** — `/sign-in`, `/auth/reset`, `/setup`, `/p/[token]` (public practice page), `/unsubscribe/[token]`. Gated public in `middleware.ts` `PUBLIC_PATHS`.
- **Authenticated (any role)** — everything under `(app)/`: `/dashboard`, `/contacts*`, `/practices*`, `/deals*`, `/tasks`, `/calendar`, `/matching`, `/launches*`, `/campaigns*`, `/settings`, and all record sub-tabs.
- **Manager-gated** — `/reporting`, `/reporting/reports`, `/reporting/email` (`requireRole("manager")`). **Note:** `/reporting/activity` is NOT gated (SEV-LOW-03).
- **Admin-gated** — entire `/admin/*` tree via `admin/layout.tsx` `requireRole("admin")`.

### API routes / webhooks / cron

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /api/webhooks/3cx` | static header secret | timing-unsafe, no HMAC (SEV-HIGH-02) |
| `GET /api/cron/stalled-deals`, `/task-reminders`, `/heartbeat`, `/campaign-dispatch` | `Bearer CRON_SECRET` | timing-unsafe + fail-open if unset (SEV-MED-05) |
| `GET /api/auth/microsoft/start` + `/callback` | session (`requireProfile`) | state-CSRF + AES-GCM tokens — **correct** |

### Server actions

~30 `"use server"` action modules. Gating verified: all `/admin/*` actions `requireRole("admin")`; deal actions `deals.edit`; campaign/launch/intro `campaigns.send`; `archiveContact`→`contacts.delete`, `eraseContact`→`contacts.erase`; document/journal delete are author-or-admin; calendar events organiser-or-admin; all others require at least `requireProfile()`. **Exceptions:** `systemJournal` is exported without a guard (SEV-LOW-02). **No mass-assignment sink** — every action whitelists via Zod. (All of this is moot against direct PostgREST — see CRITICAL-01/HIGH-03.)

### Data layer

- **47 tables, RLS enabled on 47/47** (cross-checked: every `create table` has either an explicit `enable row level security` or membership in the `0003` RLS loop). **No table is left unprotected.** This neutralises the `grants.sql` anon grants (RLS with no `to anon` policy denies anon).
- Policy shape: `for select/insert/update/delete to authenticated using(true)`. Tightened exceptions: `graph_connections` (owner-only — holds OAuth tokens), `notifications` (owner-only), `profiles` (self-update — but column-unrestricted, see CRITICAL-01).
- One `SECURITY DEFINER` function: `handle_new_user()` — `search_path` **is** pinned to `public` (good).

### Storage buckets

- **`documents`** — created private (`public=false`, migration `0019`), authenticated RLS policies scoped to the bucket. Holds practice headline photos + record documents. All downloads via signed URLs (1h photos / 10min docs). **Correct** — but see SEV-MED-01 (no MIME allow-list on general document upload).

### External services & data egress

| Service | Data that leaves the system |
|---|---|
| Supabase (DB/Auth/Storage) | all app data (first-party host) |
| Anthropic Claude | call transcripts, contact names, practice descriptions (for AI call analysis) |
| Deepgram (via 3CX) | call audio/recordings for transcription |
| Microsoft Graph | mail/calendar sync (dormant until configured) |
| Resend | **nothing** — not wired |

---

## Findings register (by severity)

### [SEV-CRITICAL-01] Any authenticated user can self-escalate to `admin` via the `profiles` RLS policy

- **Location:** `supabase/migrations/0003_shared_comms_calendar.sql:409-410` (`profiles_self_update`)
- **Severity:** Critical
- **Category:** Authorisation
- **What it is:** The self-update policy restricts *which row* a user may edit (`using (id = auth.uid()) with check (id = auth.uid())`) but not *which columns*. There is no `BEFORE UPDATE` column guard (the only trigger is `set_updated_at`), and the `role` check-constraint permits `'admin'`.
- **Impact:** Any signed-in agent, using the public anon key + their own JWT, issues `PATCH /rest/v1/profiles?id=eq.<their-uuid>` with body `{"role":"admin"}`. On the next request `getProfile()` reads `role='admin'`, `requireRole("admin")` passes, and the entire Control Centre — whose actions run under the **service-role** key — is theirs: invite/disable users, change anyone's role, edit permissions, GDPR-erase contacts, play call recordings. Every role gate in the product falls at once. The app's own settings action is irrelevant because the attacker never calls it.
- **Amplifier:** `handle_new_user()` (`0001:67-82`) auto-provisions every new `auth.users` row as an active `agent`. **If Supabase Auth public email signup is enabled** (a dashboard setting the repo cannot reveal), a complete stranger self-registers → becomes an agent → self-escalates to admin. That path is unauthenticated→admin.
- **Confidence:** Confirmed (policy + constraint + absence of column guard all verified in-repo).
- **Proposed fix:** Add a `BEFORE UPDATE` trigger on `profiles` that rejects any change to `role`, `is_active`, or `branch_id` unless the caller is `service_role` (so admin actions via `createAdminClient` still work); or narrow `profiles_self_update` to a column list. Then **disable public signups** in the Supabase Auth dashboard. Blast radius: touches the self-service settings save path — must confirm `updateMySettings` (name/colour/signature only) still succeeds.
- **Effort:** S (trigger) + config change.

### [SEV-HIGH-01] No security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy)

- **Location:** `next.config.ts:1-10` (no `async headers()`)
- **Severity:** High (defence-in-depth for a staff PII app)
- **Category:** Config
- **What it is:** The Next config sets only `eslint.ignoreDuringBuilds` and a 25 MB action body limit. No security response headers are emitted.
- **Impact:** No `X-Frame-Options`/`frame-ancestors` → the authenticated CRM is clickjackable. No CSP → the app relies entirely on React escaping + iframe sandboxes; the moment any HTML-injection sink is introduced it is directly exploitable, with no backstop. No `nosniff` → compounds SEV-MED-01 (MIME sniffing on uploads).
- **Confidence:** Confirmed.
- **Proposed fix:** Add `async headers()` returning HSTS, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a CSP (start report-only to avoid breaking the `sandbox=""` email iframes and Supabase/Anthropic connections). Blast radius: a too-strict CSP can break inline styles / iframe previews — ship report-only first.
- **Effort:** M.

### [SEV-HIGH-02] 3CX webhook: timing-unsafe secret, no HMAC over body, no replay protection

- **Location:** `src/app/api/webhooks/3cx/route.ts:35`
- **Severity:** High (Critical blast radius if the shared secret leaks)
- **Category:** Authorisation / Injection
- **What it is:** Authentication is a static `x-webhook-secret` header compared with `!==` (not `crypto.timingSafeEqual`; `timingSafeEqual` appears nowhere in the repo). Nothing signs the request body, and there is no timestamp/nonce.
- **Impact:** The comparison leaks timing on a repeatedly-callable public endpoint. With the secret, an attacker forges call events, **injects an attacker-authored transcript (≤100 000 chars)**, aims a bogus "call logged" journal entry at any real contact by supplying their phone number, and triggers inline Claude analysis of that hostile text — all written via the **service-role** client (RLS bypassed). Idempotency on `call_id` only blocks exact dupes; incrementing `call_id` replays freely.
- **Confidence:** Confirmed (code path); Critical ceiling is conditional on secret compromise.
- **Proposed fix:** Verify an HMAC-SHA256 of the **raw** request body (+ a timestamp freshness window) using `timingSafeEqual`; keep the existing `if (!secret) 503` guard. Blast radius: requires 3CX to send a signature header — coordinate with the telephony integration.
- **Effort:** M.

### [SEV-HIGH-03] Role separation is not enforced at the data layer — any agent bypasses every server-action gate via PostgREST

- **Location:** `supabase/migrations/0003:372-395` (the `using(true)` policy loop) + the whole server-action gating model
- **Severity:** High
- **Category:** Authorisation
- **What it is:** All role/permission checks (manager-only reporting, `deals.edit`, author-only journal delete, `contacts.erase`) live in server actions/loaders. The data layer grants every authenticated user full read/write on all business tables. The client has the anon key + JWT and can call PostgREST directly.
- **Impact:** Without even escalating to admin, an `agent` can: read all reporting data and audit history the UI hides from them; `PATCH`/`DELETE` other users' tasks, journals, deals, campaigns, contacts directly (leaving **no audit row** — see SEV-MED-06); insert `campaign_recipients`; toggle suppressions. The permission matrix is cosmetic against direct API use. This is the systemic form of CRITICAL-01.
- **Confidence:** Confirmed.
- **Proposed fix:** Decide explicitly between two models and document it: **(a)** accept the "trusted single firm" model — then downgrade the advertised role separation to "UI convenience only" and rely on it for nothing security-relevant; or **(b)** enforce roles in RLS (e.g. reporting/admin tables `to authenticated using (is_manager())`, author-scoped deletes) so the gates hold against direct API calls. Blast radius of (b) is large (every policy) — stage carefully.
- **Effort:** L.

### [SEV-MED-01] Document upload has no content-type allow-list (SVG/HTML uploadable)

- **Location:** `src/lib/actions/documents.ts:33-35`
- **Severity:** Medium
- **Category:** Injection / Config
- **What it is:** `uploadDocument` accepts any MIME (`file.type || "application/octet-stream"`). Unlike headline images (which allow-list jpeg/png/webp/gif), general documents can be `image/svg+xml` or `text/html`.
- **Impact:** A stored SVG/HTML file, opened via its signed URL, renders on the Supabase storage domain (off-origin from the CRM, so no CRM cookie theft) — but enables phishing/HTML content hosted under the org's storage domain. Combined with missing `nosniff` (SEV-HIGH-01) it is worse. Filename is sanitised and keys are UUID-namespaced, so no path traversal.
- **Confidence:** Confirmed (missing allow-list); Medium exploitability.
- **Proposed fix:** Allow-list document MIME types and force a safe `contentType` on upload. Blast radius: may reject legitimate unusual formats — confirm the accepted set with the team.
- **Effort:** S.

### [SEV-MED-02] Raw database `error.message` returned to the client in ~40 server actions

- **Location:** e.g. `src/lib/actions/documents.ts:48,89`; `practices/actions.ts` (multiple); `contacts/actions.ts:181,244`; `campaigns/actions.ts`; `headline-actions.ts:47,76`; and ~35 more
- **Severity:** Medium
- **Category:** Config (info disclosure)
- **What it is:** `fail(error.message)` surfaces Postgres/PostgREST driver text to the browser.
- **Impact:** Leaks column/constraint/table/RLS-policy names to authenticated users, aiding schema mapping and RLS-bypass probing. Safe pattern already exists for some codes (e.g. `23505`→friendly) but is applied inconsistently.
- **Confidence:** Confirmed.
- **Proposed fix:** Return a generic message; log the detail server-side. Blast radius: minor UX (less specific errors).
- **Effort:** M (many call sites — a shared helper).

### [SEV-MED-03] GDPR erasure is incomplete — PII survives in call/AI/enquiry tables and third parties

- **Location:** `src/app/(app)/contacts/actions.ts:193-249` (`eraseContact`)
- **Severity:** Medium
- **Category:** Privacy
- **What it is:** Erase anonymises the `contacts` row, deletes documents+storage, blanks journal bodies, deletes buyer criteria/areas — but does not touch `call_recordings.transcript/.summary`, `ai_suggestions.payload`, `ai_jobs.input` (≤8000 chars raw transcript), `notifications.body`, or `practice_enquiries`, and issues no delete request to Deepgram/Anthropic.
- **Impact:** An "erased" data subject remains identifiable across call and AI tables — a UK GDPR right-to-erasure gap.
- **Confidence:** Confirmed.
- **Proposed fix:** Extend erasure to those tables (by matched `contact_id`/phone), and document the third-party position. Blast radius: deletes more data — confirm scope with the team.
- **Effort:** M.

### [SEV-MED-04] No retention/purge of call recordings and transcripts

- **Location:** `src/lib/telephony/process.ts` (no purge scheduler)
- **Severity:** Medium
- **Category:** Privacy
- **What it is:** Suggestions expire at 14 days, but transcripts/summaries/recordings are kept indefinitely. No retention job exists.
- **Impact:** Sensitive call content (special-category-adjacent PII) accumulates forever — a data-minimisation/retention failure.
- **Confidence:** Confirmed.
- **Proposed fix:** A retention cron that deletes recordings/transcripts past a configured age. Blast radius: destructive — needs a policy decision on the window.
- **Effort:** M.

### [SEV-MED-05] Cron auth fails open if `CRON_SECRET` is unset, and is timing-unsafe

- **Location:** `src/app/api/cron/{stalled-deals,task-reminders,heartbeat,campaign-dispatch}/route.ts` (the `authorization !== \`Bearer ${process.env.CRON_SECRET}\`` check)
- **Severity:** Medium (contingent on env misconfig)
- **Category:** Authorisation
- **What it is:** If `CRON_SECRET` is empty/unset, the comparison target becomes the literal `"Bearer undefined"`, which an attacker can send verbatim. The 3CX webhook correctly guards this (`if (!secret) 503`); the cron routes do not. Comparison is also non-constant-time.
- **Impact:** With the secret unset, an unauthenticated caller triggers campaign dispatch, stalled-deal flagging, AI/suggestion expiry, and mass in-app notifications. (Outbound email is inert today — provider stubbed.)
- **Confidence:** Confirmed (fail-open logic); impact contingent on deployment.
- **Proposed fix:** Return 503 when the secret is unset; compare with `timingSafeEqual`. Blast radius: none if the secret is set.
- **Effort:** S.

### [SEV-MED-06] No rate limiting anywhere (public enquiry, login, AI, webhook)

- **Location:** global; worst at `src/app/p/[token]/actions.ts:21` (unauthenticated, service-role)
- **Severity:** Medium
- **Category:** Config
- **What it is:** No throttle/CAPTCHA/limiter anywhere (`ratelimit|429|throttle` → 0 matches). The public enquiry has only a honeypot.
- **Impact:** Anyone with a launch URL can flood `practice_enquiries` + `journal_entries` (service-role writes) → DB/journal spam staff must triage. Login has no app-layer defence against credential stuffing (relies on Supabase's own limits). A leaked webhook secret allows unbounded Deepgram/Claude spend.
- **Confidence:** Confirmed.
- **Proposed fix:** Per-IP limiter on the enquiry action first; consider one for login and the webhook. Blast radius: low.
- **Effort:** M.

### [SEV-MED-07] `xlsx ^0.18.5` (SheetJS) is a known-vulnerable range

- **Location:** `package.json` (`xlsx: ^0.18.5`)
- **Severity:** Medium (contingent on parsing attacker-supplied workbooks)
- **Category:** Dependency
- **What it is:** 0.18.x on npm carries prototype-pollution (CVE-2023-30533) and ReDoS (CVE-2024-22363); fixes ship only via SheetJS's CDN ≥0.20.2, not npm.
- **Impact:** If any uploaded/imported `.xlsx` is parsed server-side with this, exploitable. (Confirm whether import parses untrusted workbooks or only exports.)
- **Confidence:** Confirmed (version); exploitability needs the import path verified.
- **Proposed fix:** Move to the patched SheetJS build, or confirm xlsx is export-only. Blast radius: dependency swap — test export/import.
- **Effort:** S–M.

### [SEV-MED-08] Audit trail is bypassable and incompletely written

- **Location:** `src/lib/audit.ts` + `0003:376-395`
- **Severity:** Medium
- **Category:** Privacy / Authorisation
- **What it is:** `changed_by` is trustworthy (verified session) and forged audit rows are impossible (no INSERT policy) — but direct PostgREST `UPDATE`/`DELETE` (SEV-HIGH-03) writes **no** audit row, and several in-app actions (`saveTask`, `saveViewing`, `saveCalendarEvent`, `createJournalEntry`, contact-link/match/checklist actions) don't call `audit()`.
- **Impact:** The audit log records well-behaved app usage only; it is not tamper-evidence against the users it tracks.
- **Confidence:** Confirmed.
- **Proposed fix:** Depends on HIGH-03's model decision; at minimum extend `audit()` coverage to the missing actions.
- **Effort:** M.

### [SEV-LOW-01] Merge-tag substitution is not HTML-escaped

- **Location:** `src/lib/merge-tags/index.ts:21-26` (used at `email/dispatch.ts:103-105`)
- **Severity:** Low
- **Category:** Injection
- **What it is:** `renderMergeTags` does `String(value)` with no escaping, bypassing `launch-template.ts`'s careful `esc()` for `{{contact.*}}`/`{{sender.*}}`. Impact is email-only (mail clients don't run JS) and **no provider is live**, so nothing sends today. Escape before wiring Resend.
- **Confidence:** Confirmed. **Effort:** S.

### [SEV-LOW-02] `systemJournal` is an exported server action with no auth guard

- **Location:** `src/lib/actions/journal.ts:46-52`
- **Severity:** Low
- **Category:** Authorisation
- **What it is:** Exported from a `"use server"` module → a callable endpoint with no `requireProfile()`. RLS still requires a valid session (caps it at Low), but any authenticated user can forge un-deletable `entry_type='system'` journal entries on any record.
- **Confidence:** Likely. **Effort:** S (add `requireProfile()` or de-export).

### [SEV-LOW-03] Per-record audit pages and the reporting activity feed lack the role gate

- **Location:** `contacts|practices|deals/[id]/audit/page.tsx`, `components/record/audit-trail.tsx`, `reporting/activity/page.tsx:17`
- **Severity:** Low
- **Category:** Authorisation
- **What it is:** These render audit/activity to any agent while sibling reporting pages are manager-gated. Only Low because the underlying tables are already agent-readable at the data layer (HIGH-03) — the missing loader gate changes nothing about real confidentiality until RLS is tightened.
- **Confidence:** Confirmed. **Effort:** S.

### [SEV-LOW-04] OAuth `ms_oauth_state` cookie missing `Secure`/`SameSite`

- **Location:** `src/app/api/auth/microsoft/start/route.ts:16`
- **Severity:** Low
- **Category:** Config
- **What it is:** Set with `httpOnly:true, maxAge:600, path:"/"` but no explicit `secure`/`sameSite`. State is still validated on callback, so CSRF is mitigated; this is TLS-downgrade defence-in-depth.
- **Confidence:** Confirmed. **Effort:** S.

### [SEV-LOW-05] Middleware public-path matching uses `startsWith`

- **Location:** `src/middleware.ts:48`
- **Severity:** Low
- **Category:** Config
- **What it is:** `pathname.startsWith("/unsubscribe")`/`"/auth"` would also match `/unsubscribe-x` or `/authxyz`. No such routes exist today; any future same-prefix route would silently become public.
- **Confidence:** Confirmed (mechanism), no current impact. **Effort:** S.

### [SEV-INFO-01] Public practice page discloses financials to any token holder

- **Location:** `src/app/p/[token]/page.tsx`
- **Severity:** Informational (by design)
- **What it is:** Trading name, street address and postcode are correctly excluded, but asking price/turnover/EBITDA/reconstituted profit/NHS value are shown to anyone holding the unguessable `/p/<uuid>` link. A forwarded email discloses practice financials. Accepted marketing tradeoff; note token handling.

### [SEV-INFO-02] Audit log is write-only; no access log of PII *views*

- **Location:** `src/lib/audit.ts`
- **What it is:** `audit()` records writes only. There is no record of who *viewed* a contact/practice. Defensible, but note for DPIA.

### [SEV-INFO-03] No subject-access (DSAR) export exists

- **What it is:** No function assembles one individual's data for a subject-access request. Compliance gap to plan for.

---

## Executive summary (for a non-technical reader)

This internal CRM is built on a deliberate "everyone in the firm can see everything" model, with the higher-privilege areas (management reports and the admin console) protected by checks in the application. Those checks are well written — **but there is one serious flaw: because staff browsers talk to the database directly, any logged-in employee can quietly change their own account to "administrator" and unlock the entire admin console.** If public sign-up happens to be switched on in the Supabase dashboard, even an outsider could register and do this. That single issue must be fixed before anything else, and public sign-up must be confirmed off. Beyond it, the system is missing standard web-security headers, has no limits on how fast the public enquiry form can be spammed, returns overly detailed database errors, and has some data-protection gaps (deleting a person doesn't fully wipe their call transcripts, and recordings are kept forever). None of these are as urgent as the admin-escalation flaw. Encouragingly, the database's row-level security is switched on everywhere, no passwords or keys are committed to the code, and there are no web-page code-injection holes.

## Count by severity

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 3 |
| Medium | 8 |
| Low | 5 |
| Informational | 3 |
| **Total** | **20** |

## Recommended fix order (with dependencies)

1. **SEV-CRITICAL-01** — profiles column guard + **disable public signup** (dashboard). Do this first; nothing else matters while it's open. *Depends on nothing.*
2. **SEV-MED-05** — cron fail-open (tiny, prevents an unauthenticated trigger). *Independent.*
3. **SEV-HIGH-02** — 3CX webhook HMAC + timing-safe. *Independent; needs telephony coordination.*
4. **SEV-HIGH-01** — security headers (CSP report-only first). *Independent.*
5. **SEV-MED-06** — rate-limit the public enquiry. *Independent.*
6. **SEV-MED-01 / SEV-MED-02 / SEV-LOW-01/02/04/05** — small hardening batch (upload allow-list, generic errors, escape merge tags, guard `systemJournal`, cookie flags, exact-path matching). *Independent.*
7. **SEV-MED-07** — resolve xlsx (after confirming import vs export). *Independent.*
8. **SEV-MED-03 / SEV-MED-04 / SEV-INFO-03** — GDPR erasure completeness, retention job, DSAR export. *Policy decisions needed.*
9. **SEV-HIGH-03 / SEV-MED-08 / SEV-LOW-03** — the model decision: keep "trusted firm" (and stop advertising role separation as a control) **or** enforce roles in RLS. This is architectural — **decide before touching the many policies.** *Depends on your call.*

## What I could NOT assess (needs a human / live environment)

- **Supabase Auth dashboard settings** — is public email signup disabled? Is MFA available/enforced for admins? Leaked-password protection? Password policy? JWT/refresh expiry and revocation-on-password-change? None are in the repo; all bear directly on CRITICAL-01. **Verify these first.**
- **Whether all migrations (esp. `0018`/`0019`/`0020`) are actually applied to the hosted project** — RLS/bucket/policy state was validated against local Postgres only.
- **`CRON_SECRET` / `THREECX_WEBHOOK_SECRET` actually set in production** (SEV-MED-05 impact hinges on this).
- **`npm audit` / live dependency CVEs** — not run (offline, read-only); `xlsx` flagged manually.
- **Dynamic testing** — no requests were sent to any environment. The IDOR/escalation findings are from code; they should be reproduced against staging to confirm, then re-tested after the fix.
- **Whether the xlsx code path parses untrusted workbooks** (import) or only writes them (export) — determines SEV-MED-07 severity.

---

*End of Phase 1. No files were modified other than this register. Awaiting your review before any remediation.*
