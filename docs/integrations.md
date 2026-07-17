# Integrations & environment setup

One-time provider setup + the full environment variable contract. Human (Oliver) performs
the account-level steps; everything else is code.

## Supabase

1. Create project in **eu-west-2 (London)** — UK data residency.
2. Enable extensions: `postgis`, `pg_trgm`, `pgcrypto`, `unaccent`, `citext`.
3. Buckets (private): `documents`, `practice-media`, `campaign-assets`, `call-recordings`
   (phase 8b).
4. Auth: email provider on; disable public signups (invite-only).
5. Link repo via Supabase CLI; migrations deploy from CI only.

## Vercel

1. Import `mego9410/ftacrm`; production branch `main`; framework Next.js.
2. Add env vars (below) for Production + Preview.
3. `vercel.json` cron entries per `docs/architecture.md`; set `CRON_SECRET`.

> **Free (Hobby) plan note:** Hobby allows max 2 cron jobs, each **once per day** with
> loose timing. `vercel.json` is currently configured within those limits (both jobs
> daily). Before go-live with real email sending, upgrade to Pro and restore the
> campaign dispatcher to `* * * * *` so queued campaigns drain within minutes rather
> than once a day. The stalled-deal scan is fine daily on any plan.

## Resend

1. Add + verify sending domain — use a **subdomain**, e.g. `mail.ft-associates.com`
   (protects the root domain's reputation): SPF, DKIM, DMARC DNS records as Resend
   instructs.
2. Create API key (full access) → `RESEND_API_KEY`.
3. Webhook endpoint `https://<prod>/api/webhooks/resend` for `email.delivered`,
   `email.opened`, `email.clicked`, `email.bounced`, `email.complained` → signing secret
   `RESEND_WEBHOOK_SECRET`.
4. Plan sizing: 7,000-recipient sends need a paid plan (100k emails/mo tier); review at
   expansion.
5. **Warm-up**: new domain — ramp campaign sizes over the first 2–3 weeks (500 → 2k → full
   list) to build sender reputation; the dispatcher's batch cap makes this a config value.

## Microsoft (Graph) — email + calendar sync

1. Azure Portal → App registration "FTA CRM" in FTA's tenant. Single-tenant.
2. Redirect URI: `https://<prod>/api/auth/microsoft/callback` (+ localhost for dev).
3. **Delegated** permissions: `Mail.Read`, `Mail.Send`, `Calendars.ReadWrite`,
   `offline_access`, `User.Read`. Grant admin consent once for the org.
4. Client secret (24-mo expiry — diarise rotation) → env vars below.
5. Webhook notification URL `https://<prod>/api/webhooks/graph` (code implements the
   validation-token handshake). Subscriptions max ~3 days for mail — renewal cron required.
6. Throttling: Graph limits per-mailbox; delta sync + webhook design already minimises
   calls. Back off on 429 honouring `Retry-After`.

## Anthropic

1. Console API key → `ANTHROPIC_API_KEY`. Set a monthly budget alert.
2. Models via env so upgrades are config: `AI_MODEL_REASONING=claude-sonnet-5`,
   `AI_MODEL_FAST=claude-haiku-4-5-20251001`.

## 3CX (phase 8b — AI call capture)

FTA's phone system is 3CX-hosted cloud, so it can reach the public webhook URL directly.

1. Admin Console → Integrations → API: create an API client (client credentials) →
   `THREECX_API_CLIENT_ID` / `THREECX_API_CLIENT_SECRET`; note the instance FQDN →
   `THREECX_FQDN`. Used server-side to poll call history and fetch recording files (XAPI).
2. Configure the server-side CRM integration (call journaling) to POST call-end events to
   `https://<prod>/api/webhooks/3cx` with a shared-secret header → `THREECX_WEBHOOK_SECRET`.
   The poll cron is the safety net, so webhook gaps are tolerated.
3. Enable call recording for the relevant extensions/queues, and set the recording
   notification announcement ("calls may be recorded…") — **required for UK compliance
   before the integration goes live**.
4. Map staff extensions to CRM profiles in Control Centre after first sync.
5. Confirm recording retention on the 3CX side is at least the CRM's fetch window; the CRM
   keeps its own copy in Storage, so 3CX-side retention can stay short.

## Deepgram (phase 8b — call transcription)

1. Create an API key → `DEEPGRAM_API_KEY`. Confirm the **EU-hosted endpoint** at setup
   (UK GDPR data residency) → `DEEPGRAM_API_URL`. If EU residency can't be confirmed,
   swap to Azure AI Speech (UK South) — the client is wrapped in `lib/transcription/` so
   only that module changes.
2. Pre-recorded audio API, `en-GB`, diarisation on. Set a monthly budget alert.

## Geocoding / postcode lookup

- `postcodes.io` (free, UK, no key) for postcode → lat/lng + address candidates. Wrap in
  `lib/geo/` so a paid provider (getAddress.io) can swap in if address-autocomplete quality
  disappoints.

## Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only
SUPABASE_DB_URL=                    # migrations/CI

# App
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
ENCRYPTION_KEY=                     # 32-byte base64, pgcrypto token encryption

# Resend
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
CAMPAIGN_FROM_DOMAIN=mail.ft-associates.com

# Microsoft Graph
MS_TENANT_ID=
MS_CLIENT_ID=
MS_CLIENT_SECRET=

# Anthropic
ANTHROPIC_API_KEY=
AI_MODEL_REASONING=claude-sonnet-5
AI_MODEL_FAST=claude-haiku-4-5-20251001

# 3CX (phase 8b)
THREECX_FQDN=
THREECX_API_CLIENT_ID=
THREECX_API_CLIENT_SECRET=
THREECX_WEBHOOK_SECRET=

# Deepgram (phase 8b)
DEEPGRAM_API_KEY=
DEEPGRAM_API_URL=              # EU-hosted endpoint, confirmed at setup
```

## Deliverability checklist (before first big campaign)

- [ ] SPF/DKIM/DMARC verified green in Resend.
- [ ] Warm-up ramp plan agreed.
- [ ] Unsubscribe link + physical address in footer (PECR/UK GDPR).
- [ ] Suppression list migrated from any legacy unsubscribe data.
- [ ] Test sends checked in Outlook, Gmail, Apple Mail (rendering + spam placement).
