# Phase 0 — Foundations

Scaffold, auth, org structure, admin Control Centre, and the plumbing every later phase uses.

## 0.1 Scaffold

- Next.js 15+ App Router, TypeScript strict, Tailwind v4, ESLint + Prettier.
- Import FTA tokens: copy `design-system/colors_and_type.css` + `components.css` into
  `src/styles/`, load Hanken Grotesk (+ Lora for the wordmark only) via `next/font`.
- Install shadcn/ui; restyle base primitives per `docs/design.md` (radius 16/20px, gold
  primary, ink text — get Button, Input, Select, Dialog, Dropdown, Tabs, Toast, Badge right
  now; everything inherits).
- Supabase project (region **eu-west-2 London**) + CLI wiring; first migration; generated types.
- GitHub Actions CI (typecheck, lint, test, build); Vercel project connected.

## 0.2 App shell

- Top nav per design system: FTA wordmark, primary nav (Dashboard, Contacts, Practices,
  Deals, Matching, Campaigns, Calendar, Reporting), utility cluster (global search, quick-add
  "+", notifications bell, avatar menu with Control Centre link for admins).
- Global search (⌘K): searches contacts (name/email/phone/company), practices (ref/name/
  address/postcode), deals (ref) via trigram indexes; grouped results; keyboard nav.
- Quick-add menu: New contact / New practice / New task / New event / Log call.
- Responsive down to tablet; desktop-first (office tool).

## 0.3 Auth & users

- Supabase Auth email+password; invite flow (admin creates user → invite email → set
  password). Forgot-password. Session middleware guarding `(app)` routes.
- `profiles` synced from `auth.users` via trigger; deactivation blocks sign-in but keeps
  attribution everywhere.
- Roles: `admin` (everything incl. Control Centre), `manager` (all data + reporting, no
  user/config admin), `agent` (all CRM data, no admin, no permission edits). Fine-grained
  overrides via `role_permissions`.
- Later fast-follow (not phase 0): Azure AD SSO — architecture must not preclude it.

## 0.4 Control Centre (admin area, `/admin`)

- **Users**: list, invite, edit role/branch, deactivate, resend invite.
- **Branches**: CRUD.
- **Lookups**: pick a lookup type → reorderable value list → add / rename / deactivate /
  set colour. This is the single most important admin feature (the old system's saving
  grace) — every taxonomy in the app must read from here, never hardcode display values.
- **Checklist templates**: CRUD templates + items, applies-to entity.
- **Email templates**: CRUD (full editor arrives Phase 5; basic subject+body now).
- **Permissions**: role × permission matrix editor.
- **Audit**: firm-wide audit log browser (filter by user/table/date).

## 0.5 Plumbing built now, used everywhere

- `audit()` helper + `audit_log` table + per-record AuditTrail component.
- `lookups` server helpers with caching (`getLookup('specialism')`).
- DataTable component: server-driven pagination/sort/filter, column visibility,
  row selection, CSV export, virtualised body, URL-synced state.
- RecordHeader + TabNav layout primitives (used by contacts/practices/deals).
- Toast + confirm-dialog conventions; form pattern (Zod + server action + field errors).
- Seed script: lookups, deal stages, roles/permissions, demo branch + users, sample data
  for local/preview.

## Acceptance criteria

- [ ] Sign in / invite / reset flows work; roles enforced on routes and actions.
- [ ] Admin can manage users, branches, lookup values (add "Orthodontist" without a deploy).
- [ ] Global search returns seeded records in <300ms.
- [ ] Audit trail records a change made through any seeded form.
- [ ] CI green; production deploy live on Vercel; migrations reproducible from scratch.
