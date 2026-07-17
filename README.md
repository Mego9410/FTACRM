# FTA CRM

A ground-up CRM for **Frank Taylor & Associates** — the UK's leading independent dental
practice sales agency. Replaces a repurposed estate-agency CRM (iamproperty) with a system
built around FTA's actual business: valuing, listing, and selling dental practices, matching
a 7,000+ buyer pool, and progressing deals to completion.

**Status: planning complete — build not yet started.** Start with [`PLAN.md`](PLAN.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind + FTA design system · Supabase (Postgres,
Auth, Storage — London region) · Vercel · Resend (bulk email) · Microsoft Graph (email +
calendar sync) · Anthropic API (AI features)

## Repository layout

| Path | Contents |
|---|---|
| `PLAN.md` | Master build plan — read first |
| `CLAUDE.md` | Instructions for AI build agents |
| `docs/` | Architecture, data model, per-phase feature specs, integrations, design |
| `docs/reference/` | Legacy CRM feature inventory + screenshots (context, not spec) |
| `design-system/` | FTA brand tokens, components, icons, assets |
