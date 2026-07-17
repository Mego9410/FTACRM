# FTA CRM

A ground-up CRM for **Frank Taylor & Associates** — the UK's leading independent dental
practice sales agency. Replaces a repurposed estate-agency CRM (iamproperty) with a system
built around FTA's actual business: valuing, listing, and selling dental practices, matching
a 7,000+ buyer pool, and progressing deals to completion.

## Status: core build complete

Phases 0–7 of [`PLAN.md`](PLAN.md) are built and passing typecheck, unit tests, and
production build:

- **Foundations** — auth (invite-only), branded shell, global search, Control Centre
  (users, branches, admin-editable lookups, checklist templates, permissions, audit)
- **Contacts** — unified buyers/sellers/solicitors, journal, documents, checklists,
  GDPR consent + erasure, AML flags, buyer criteria + search areas
- **Practices** — full listing lifecycle, sellers/buyers/solicitors per practice,
  valuations, viewings, offers with accept-→-deal flow
- **Deals** — 7-stage progression tracker, fall-through/hold flows, stalled detection
- **Matching** — bidirectional scored matching with bulk actions (20 unit tests)
- **Campaigns** — segment builder with live counts, merge tags, templates, suppression
  list, public unsubscribe, dispatch pipeline (**no email provider linked** — see below)
- **Calendar & tasks** — shared team calendar with per-person overlays, tasks, notifications
- **Reporting** — period-vs-period KPIs, pipeline snapshot, activity feed, smart lists

### Deliberately not linked in this build (by request)

- **Resend / email sending** — campaigns can be drafted, segmented, previewed and queued;
  dispatch is disabled behind an `EmailProvider` interface (`src/lib/email/provider.ts`).
  Linking Resend later = implement the adapter + set `RESEND_API_KEY`. No other changes.
- **AI features** (PLAN phase 8) — not built, per scope.
- **Microsoft 365 sync** — OAuth connect + encrypted token storage is implemented but
  dormant until Azure credentials are configured; mail/calendar delta sync is the
  documented next step (`docs/features/06-communications.md`).
- **Data migration** (PLAN phase 9) — awaits legacy iamproperty exports.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind v4 + FTA design tokens · Supabase
(Postgres, Auth, Storage) · Vercel · FullCalendar · Recharts · Zod · Vitest

## Getting it running

1. **Supabase**: create a project in `eu-west-2` (London). In the SQL editor or via CLI,
   apply `supabase/migrations/*.sql` in order, then `supabase/seed.sql`. Create a private
   storage bucket named `documents`. Disable public signups (Auth → providers).
   - **Optional demo data**: paste `supabase/seed_demo.sql` into the Supabase SQL editor and
     run it to load 100 buyers, 100 sellers, 50 practices (with linked sellers and interested
     buyers), offers, deals across the progression stages, and ~470 pieces of correspondence.
     It's safe to re-run (it replaces only `DEMO-…`-tagged rows) and never touches real
     records. Run it *after* creating your first admin user so activity is attributed to them.
2. **Env**: copy `.env.example` → `.env.local` and fill the Supabase URL + keys.
3. **First admin**: create a user in Supabase Auth (dashboard → Add user), then
   `update profiles set role = 'admin' where email = 'you@…'`. Sign in and invite the
   rest of the team from Control Centre → Users.
4. **Local dev**: `pnpm install && pnpm dev`.
5. **Deploy**: import the repo into Vercel, add the same env vars (plus `CRON_SECRET`),
   and the cron entries in `vercel.json` activate automatically.

Useful scripts: `pnpm typecheck` · `pnpm test` · `pnpm build` ·
`pnpm db:reset:local` (rebuild the throwaway local-validation Postgres; requires the local
cluster described in `scripts/local/`).

## Repository layout

| Path | Contents |
|---|---|
| `PLAN.md` | Master build plan and phase acceptance criteria |
| `CLAUDE.md` | Instructions for AI build agents |
| `docs/` | Architecture, data model, per-phase feature specs, integrations, design |
| `docs/reference/` | Legacy CRM feature inventory + screenshots (context, not spec) |
| `design-system/` | FTA brand tokens, components, icons, assets |
| `src/` | The application (see `docs/architecture.md` for the map) |
| `supabase/` | Migrations (source of truth for schema) + seed |
