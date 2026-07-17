# Architecture

## System overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Vercel (Next.js 15 App Router, TypeScript)                     │
│  ├─ Server Components (reads)  ├─ Server Actions (writes)       │
│  ├─ Route handlers: /api/webhooks/{resend,graph}                │
│  └─ Vercel Cron: token refresh, subscription renewal,           │
│     campaign dispatch, stalled-deal scan, digest jobs           │
└──────────┬──────────────────────────────────────────────────────┘
           │ supabase-js (anon + RLS) / service-role (server only)
┌──────────▼──────────────────────────────────────────────────────┐
│  Supabase (eu-west-2, London)                                   │
│  ├─ Postgres (+ PostGIS, pg_trgm, pgcrypto)                     │
│  ├─ Auth (email/password → Azure SSO later)                     │
│  ├─ Storage: documents/, practice-media/, campaign-assets/      │
│  └─ Realtime: notifications, deal board                         │
└─────────────────────────────────────────────────────────────────┘
External: Resend (bulk + transactional email, webhooks in)
          Microsoft Graph (mail delta sync, calendar 2-way, per-user OAuth)
          Anthropic API (AI features, server-side only)
```

## Project structure

```
src/
  app/
    (auth)/sign-in/
    (app)/                     # authenticated shell: nav, global search, notifications
      dashboard/               # My Day
      contacts/ [id]/
      practices/ [id]/
      deals/
      matching/
      campaigns/ [id]/
      calendar/
      reporting/
      admin/                   # Control Centre (role-gated)
    api/
      webhooks/resend/route.ts
      webhooks/graph/route.ts
      cron/[job]/route.ts      # secured with CRON_SECRET
  components/
    ui/                        # shadcn primitives, FTA-restyled
    record/                    # shared record-page building blocks:
                               # RecordHeader, TabNav, Journal, Documents,
                               # Checklist, AuditTrail, ContactChip
    tables/                    # DataTable + filters + virtualisation
  lib/
    supabase/                  # client factories (browser, server, service-role)
    graph/                     # Microsoft Graph client, token store, delta sync
    resend/                    # campaign dispatcher, webhook verification
    ai/                        # Anthropic client, prompt builders, feature fns
    matching/                  # pure matching/scoring functions (unit-tested)
    merge-tags/                # template token rendering (unit-tested)
    audit.ts                   # audit-log write helper
    permissions.ts             # role/permission checks
  types/                       # generated supabase types + domain types
supabase/
  migrations/                  # numbered SQL migrations (source of truth for schema)
  seed.sql                     # default lookups, stages, checklist templates, demo data
```

## Key conventions

- **Reads** in Server Components with the user-scoped Supabase client (RLS enforced).
  Interactive views (boards, tables, calendar) hydrate via TanStack Query hitting server
  actions/route handlers — never expose service-role to the browser.
- **Writes** only via Server Actions: Zod-validate input → permission check
  (`lib/permissions.ts`) → mutate → `audit()` → `revalidatePath`. One action per use case.
- **IDs** are `uuid` (default `gen_random_uuid()`). Human-facing references (e.g. practice ref
  `P-2026-0142`) are generated from sequences and immutable.
- **Money** stored as `numeric(12,2)` GBP. **Dates** as `date` where time-of-day is
  meaningless (stage dates), `timestamptz` otherwise.
- **Soft delete** (`archived_at`) for business entities; hard delete only via GDPR erasure
  routine.
- **Generated DB types** — regenerate `types/supabase.ts` with the Supabase CLI after every
  migration; never hand-edit.

## Security model

- **Roles**: `admin`, `manager`, `agent` stored on `profiles.role`. Fine-grained ability flags
  in `role_permissions` lookup so admin can adjust without code (mirrors the old system's
  module permissions but simpler).
- **RLS**: enabled on every table. Baseline policy: authenticated staff can read all business
  data (FTA is one firm; branch scoping is a filter, not a security boundary). Writes checked
  against role. Sensitive tables (`graph_connections`, `audit_log`, `ai_jobs`) restricted:
  users see only their own connections; audit read-only for all, insert via server only.
- **Secrets**: Supabase service-role key, Resend key, Graph client secret, Anthropic key —
  Vercel server env only. Webhooks verify signatures (Resend Svix signature; Graph
  `clientState` + validation-token handshake).
- **Graph tokens**: refresh tokens encrypted with `pgcrypto` (`ENCRYPTION_KEY` env) in
  `graph_connections`; decrypted server-side only.
- **Cron endpoints**: require `Authorization: Bearer ${CRON_SECRET}`.
- **GDPR**: consent flags per channel on contacts; suppression list enforced at dispatch;
  erasure routine anonymises PII in place (keeps aggregate stats intact); Supabase project in
  London region; storage buckets private with signed URLs.

## Background jobs (Vercel Cron)

| Job | Schedule | Purpose |
|---|---|---|
| `graph-renew-subscriptions` | every 30 min | Renew Graph webhook subscriptions before ~3-day expiry |
| `graph-delta-sync` | every 10 min | Safety-net mail/calendar delta pull per connected user (webhooks are primary) |
| `campaign-dispatch` | every minute | Drain queued campaign batches to Resend within rate limits |
| `stalled-deal-scan` | daily 07:00 | Flag deals with no activity ≥ N days; notify deal owner |
| `smart-list-refresh` | hourly | Recompute saved-list counts for dashboard |
| `ai-digest` | daily 07:30 | Optional per-user "your day ahead" brief |

## Environments

- **Production**: `main` → Vercel prod + Supabase prod project.
- **Preview**: PRs → Vercel preview + Supabase branch (or a shared staging project) with
  seeded demo data; external providers use test keys (Resend test domain, Graph dev app).
- **Local**: `supabase start` (local stack) + `.env.local`. Seed via `supabase/seed.sql`.

## CI (GitHub Actions)

On PR: `tsc --noEmit` → ESLint → Vitest → build → Playwright smoke against local Supabase.
Migrations applied to prod via Supabase CLI in a deploy workflow, never by hand.
