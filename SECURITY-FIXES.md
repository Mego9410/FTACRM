# FTA CRM — Security Fixes (Phase 2/3)

Branch: `security-audit`. Each fix is committed with a `fix(security): [SEV-…]` message. Verified against local Postgres + `pnpm typecheck` / `pnpm build` / `pnpm test` (57/57). **Not pushed / not merged** — this is auth/RLS-sensitive; deploy after your review.

| Finding | Status | Commit |
|---|---|---|
| SEV-CRITICAL-01 role self-escalation | **Fixed** | `5e49ae9` |
| SEV-HIGH-01 security headers | **Fixed** (CSP report-only) | `862ea37` |
| SEV-HIGH-02 webhook auth | **Fixed** | `862ea37` |
| SEV-HIGH-03 role separation at data layer | **Needs your decision** (see below) | — |
| SEV-MED-01 upload MIME allow-list | **Fixed** | `9882c37` |
| SEV-MED-02 DB error leakage | **Fixed** | `9f5d331` |
| SEV-MED-03 GDPR erasure completeness | **Fixed** | `9882c37` |
| SEV-MED-04 retention purge | **Fixed** (route added, not scheduled) | `9882c37` |
| SEV-MED-05 cron fail-open | **Fixed** | `862ea37` |
| SEV-MED-06 rate limiting | **Fixed** (enquiry) | `9882c37` |
| SEV-MED-07 xlsx CVE | **No change — not applicable** (see below) | — |
| SEV-MED-08 audit coverage | **Deferred** (tied to HIGH-03) | — |
| SEV-LOW-01 merge-tag escaping | **Fixed** | `9882c37` |
| SEV-LOW-02 systemJournal guard | **Fixed** | `9882c37` |
| SEV-LOW-03 activity-feed gate | **Fixed** | `9882c37` |
| SEV-LOW-04 OAuth cookie flags | **Fixed** | `9882c37` |
| SEV-LOW-05 middleware path matching | **Fixed** | `9882c37` |
| SEV-INFO-01/02/03 | **Accepted / deferred** (see below) | — |

---

## Fixed — details & how to verify yourself

### SEV-CRITICAL-01 — profiles self-escalation (`0021_security_profiles_column_guard.sql`)
A `BEFORE UPDATE` trigger rejects changes to `role`/`is_active`/`branch_id` unless the caller is the service role (admin actions) or a direct DB connection (migrations). Plus your operational control: **public signup is off, accounts are admin-created only**, which closes the unauthenticated amplifier.
**Verify (local, already run):** as an authenticated JWT, `update profiles set role='admin'` → `ERROR: Not authorised…`; as service_role → succeeds; `update profiles set full_name=…` as authenticated → succeeds.
**To deploy:** apply migration `0021` to Supabase, and confirm Auth → "Allow new users to sign up" is OFF.
**Regression to test:** the Settings page (name/colour/signature save) must still work; admin "invite user / change role" must still work.

### SEV-HIGH-01 — security headers (`next.config.ts`)
HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` are **enforced**. CSP ships as **`Content-Security-Policy-Report-Only`** so it cannot break the app.
**Verify:** `curl -sI https://<app>/dashboard | grep -i -E 'x-frame|content-type-options|strict-transport|referrer|permissions-policy|content-security'`.
**Action left to you:** watch CSP violation reports for a few days, then promote to enforcing by renaming the header key to `Content-Security-Policy` (paying attention to the sandboxed email-preview iframes and Supabase XHR/WS).

### SEV-HIGH-02 — 3CX webhook (`api/webhooks/3cx/route.ts`, `lib/http/verify-secret.ts`)
Now verifies an HMAC-SHA256 of the **raw body** (`x-webhook-signature: sha256=…`) when present, else a **constant-time** static-secret comparison. Cron routes likewise use constant-time compare.
**Verify:** a request with a wrong secret → 401; timing no longer varies with prefix. If you can configure 3CX to sign, set `x-webhook-signature`.

### SEV-MED-01 — document upload allow-list (`lib/actions/documents.ts`)
Rejects anything outside a PDF/image/Office/CSV allow-list; forces the stored `contentType` to the validated MIME (no HTML/SVG execution surface).
**Verify:** upload a `.svg`/`.html` → "That file type isn't supported."

### SEV-MED-02 — DB error leakage (`lib/action-result.ts` + ~28 files)
`dbFail()` logs the real driver error server-side and returns "Something went wrong. Please try again." Replaced all ~80 `fail(<err>.message)` sites.
**Verify:** `grep -rn "fail(.*\.message)" src` → no matches; trigger a duplicate insert and confirm the browser sees the generic message.

### SEV-MED-03 — GDPR erasure (`contacts/actions.ts eraseContact`)
Now also nulls `call_recordings.transcript/summary`, blanks `ai_jobs.input/output` for the contact's recordings, deletes `ai_suggestions` by `contact_id`, and deletes `practice_enquiries` by the erased email.
**Verify:** erase a demo contact that has a call, then query those tables for residual PII → none.
**Note:** third parties (Deepgram/Anthropic) already received transcripts at capture time; propagating deletion to them is a process step, not code.

### SEV-MED-04 — retention purge (`api/cron/retention/route.ts`)
Deletes `call_recordings` (and cascaded AI rows) older than `RETENTION_DAYS` (default 365). **Not scheduled** — per the operating rules I did not change CI/CD; add it to `vercel.json` `crons` once you've agreed a window.
**Verify:** `curl -H "authorization: Bearer $CRON_SECRET" https://<app>/api/cron/retention`.

### SEV-MED-05 — cron fail-open (`api/cron/*`, `lib/http/verify-secret.ts`)
`cronUnauthorized()` returns 503 when `CRON_SECRET` is unset and compares constant-time.
**Verify:** unset the secret locally → cron returns 503, not 200.

### SEV-MED-06 — rate limiting (`p/[token]/actions.ts`, `lib/http/rate-limit.ts`)
Per-IP in-memory burst guard (5 / 10 min) + durable per-practice DB throttle (20 / 10 min).
**Verify:** submit the enquiry form >5 times quickly → "Too many requests."

### SEV-LOW-01…05
- Merge-tag values HTML-escaped in launch email bodies (`{ escapeHtml: true }`).
- `systemJournal` now calls `requireProfile()`.
- Reporting activity feed now `requireRole("manager")`.
- `ms_oauth_state` cookie gets `secure` (prod) + `sameSite:"lax"`.
- Middleware public-path check uses exact/segment matching.

---

## Not fixed — and why

### SEV-HIGH-03 — role separation is not enforced at the data layer → **your decision**
This is architectural, not a one-line bug, and the operating rules say stop before broad RLS changes on live-data tables. The situation after CRITICAL-01: no one can escalate to **admin** anymore, but any authenticated **agent** can still read/write business tables directly via PostgREST, bypassing the manager/permission gates that live only in server actions. Two options:
- **(A) Accept the "trusted single firm" model** (your clarification that all accounts are admin-created supports this). Then treat the role/permission gates as UI convenience, not a security boundary, and document that. **Lowest effort, no code.**
- **(B) Enforce roles in RLS** — add an `is_manager()`/`is_admin()` SECURITY DEFINER helper and tighten policies on the sensitive tables (`audit_log`, `call_recordings`, reporting sources) from `using(true)` to role-checked. **Large, must be staged, risks breaking reads (e.g. journal call-intel for agents).**
Tell me which, and I'll implement it as its own reviewed change. **MED-08** (audit-trail coverage/tamper-evidence) and **INFO-02** (view-access logging) hang off this decision, so they're deferred with it.

### SEV-MED-07 — xlsx → **not applicable**
`xlsx` is used **export-only** (`lib/export.ts` calls `XLSX.writeFile` on the user's own report data). The SheetJS CVEs (prototype pollution / ReDoS) trigger when **reading** attacker-supplied workbooks, which this app never does. Swapping to the patched build would mean pulling from a non-registry source (a supply-chain tradeoff the rules flag). **Recommendation:** leave as-is unless you add a spreadsheet *import* feature, at which point move to the patched SheetJS.

### SEV-INFO-01 (public-page financials) — accepted by design (marketing link; no PII/address/name).
### SEV-INFO-03 (DSAR export) — a feature to build, not a vuln fix; flag for the roadmap.

---

## Remaining manual actions for you (nothing else blocks deploy)
1. Apply migration `0021` to Supabase; confirm public signup is OFF; confirm MFA/leaked-password protection settings (Auth dashboard — outside the repo).
2. After watching CSP reports, promote CSP from Report-Only to enforcing.
3. Decide HIGH-03 model (A or B) so I can close MED-08 / INFO-02.
4. Optionally schedule `/api/cron/retention` in `vercel.json` once a retention window is agreed.
5. Confirm `CRON_SECRET` and (if telephony is used) `THREECX_WEBHOOK_SECRET` are set in production.

## Regression test recommendations (to catch these classes returning)
- **Authz model test:** an automated test that, as a seeded `agent` JWT, attempts `PATCH /profiles {role:admin}` and asserts it fails — this is the single highest-value regression guard.
- A test asserting every `"use server"` export calls an auth helper (lint/AST check).
- A test asserting no `fail(*.message)` pattern reappears (grep in CI).
- A header smoke test asserting the security headers are present on `/dashboard`.
