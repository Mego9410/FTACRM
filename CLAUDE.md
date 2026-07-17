# FTA CRM — agent instructions

You are building a ground-up CRM for Frank Taylor & Associates (FTA), a UK dental-practice
sales agency. **Read `PLAN.md` first** — it is the master plan and document map. Then read
the spec for whichever phase you're working on in `docs/features/`.

## Orientation

- `PLAN.md` — vision, terminology, stack, build phases, definition of done.
- `docs/data-model.md` — the schema. Follow it; if implementation forces a change, update
  the doc in the same PR.
- `docs/architecture.md` — project structure, conventions, security model. Conventions there
  are binding (server actions for writes, RLS everywhere, audit helper, etc.).
- `docs/design.md` + `design-system/` — brand rules. Gold `#E4AD25` accent, Hanken Grotesk,
  sentence case, **no emoji anywhere in the product**, supplied SVG icons only.
- `docs/reference/` — inventory + ~90 screenshots of the legacy system being replaced.
  Context only; where it conflicts with the plan, the plan wins. Do not rebuild vestigial
  real-estate features (Rooms, EPC, Council Tax, portals).

## Tooling available

- **Supabase MCP server** is configured in `.mcp.json` (project scope), pointed at the
  project's Supabase instance. Use it for schema inspection, running migrations, and
  querying — prefer it over hand-written `psql`/REST calls where it covers the task. Run
  `claude /mcp` once per environment to authenticate before first use.
- **Supabase Agent Skills** are installed under `.agents/skills/` (symlinked into
  `.claude/skills/`): `supabase` (general Supabase usage) and
  `supabase-postgres-best-practices` (schema/query/RLS/locking/connection-pooling
  reference). Consult `supabase-postgres-best-practices` before writing migrations in
  `supabase/migrations/` — the data model in `docs/data-model.md` should follow its
  indexing, RLS, and constraint guidance.

## Working rules

- Work phase by phase in PLAN.md order; meet each phase's acceptance criteria (checklists
  in the feature docs) before moving on, and tick them off in the doc as you land them.
- Schema changes only via numbered migrations in `supabase/migrations/`; regenerate
  `types/supabase.ts` after each; keep `supabase/seed.sql` working.
- Terminology in UI: Practice (not property), Seller (not vendor), Buyer (not applicant),
  Deal (not sales progression), Valuation (not appraisal).
- Every taxonomy/picklist reads from the lookups system — never hardcode display values.
- Business-field mutations go through server actions that call the `audit()` helper.
- Unit-test the pure cores: matching, merge tags, campaign snapshot/suppression, migration
  mappings. Playwright smoke per phase.
- Secrets stay server-side; see `docs/integrations.md` for the env contract. Never commit
  keys.
- UK context: GBP, DD/MM/YYYY display, Europe/London timezone, UK GDPR/PECR for email
  consent and unsubscribe.
