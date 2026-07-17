# Integrations & environment setup

One-time provider setup + the full environment variable contract. Human (Oliver) performs
the account-level steps; everything else is code.

## Supabase

1. Create project in **eu-west-2 (London)** — UK data residency.
2. Enable extensions: `postgis`, `pg_trgm`, `pgcrypto`, `unaccent`, `citext`.
3. Buckets (private): `documents`, `practice-media`, `campaign-assets`.
4. Auth: email provider on; disable public signups (invite-only).
5. Link repo via Supabase CLI; migrations deploy from CI only.

## Vercel

1. Import `mego9410/ftacrm`; production branch `main`; framework Next.js.
2. Add env vars (below) for Production + Preview.
3. `vercel.json` cron entries per `docs/architecture.md`; set `CRON_SECRET`.

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
```

## Deliverability checklist (before first big campaign)

- [ ] SPF/DKIM/DMARC verified green in Resend.
- [ ] Warm-up ramp plan agreed.
- [ ] Unsubscribe link + physical address in footer (PECR/UK GDPR).
- [ ] Suppression list migrated from any legacy unsubscribe data.
- [ ] Test sends checked in Outlook, Gmail, Apple Mail (rendering + spam placement).
