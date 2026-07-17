# Phase 9 — Data migration & go-live

Migrate iamproperty data (~4,240 properties, ~4,770 vendors, ~9,680 applicants, ~420 deals,
plus journals/offers/documents where exportable) into the new model. Migration quality
decides go-live trust — build it as real, tested software, not a one-off script.

## 9.1 Source exports

iamproperty offers CSV exports / report extracts (exact shapes TBD — first task: obtain one
full export set and check real columns into `docs/reference/migration-samples/`
**with PII redacted**). Expected sets: Properties, Vendors, Applicants, Solicitors, Offers,
Sales Progression, Journal, Documents (files may need manual bulk download).

## 9.2 Pipeline

```
CSV → staging.* (raw, verbatim) → transform (mapping + cleaning) → production tables
                                        ↓
                              validation report + issue queue
```

- Import CLI (`scripts/migrate/`): load CSVs to `staging.*` with row hashes (re-runnable,
  idempotent); transforms are pure, unit-tested functions; `--dry-run` writes the report
  without touching production; full run wraps per-entity transactions.
- Every produced row records provenance: `legacy_ref` column on contacts/practices/deals
  (old iamproperty id) — supports spot-checks and permanent cross-reference.

## 9.3 Field mapping — the tricky part

The old system holds dental taxonomy in repurposed real-estate slots. Mapping table
(maintained as data, `scripts/migrate/mappings/*.ts`, reviewed by FTA before the run):

| Legacy slot | Legacy values | → New field |
|---|---|---|
| Property Age (applicant criteria) | Affiliate, Associate, Associate – Practice only, Associate Plus | `buyer_criteria.deal_structure_ids` |
| Custom Style | Endodontist, Hygienist, Implantologist, Oral Surgeon… | `buyer_criteria.specialism_ids` |
| Other Criteria | "FH Mixed\|Freehold", "FH NHS\|Freehold", "FH/LH Mixed\|FH or LH"… | split → `funding_type_ids` + `tenure_type_ids` (parser + tests for the pipe format) |
| Bedrooms | numeric | `surgeries` / `min_surgeries` |
| Vendor / Applicant / Solicitor types | | `contacts.roles` |
| Property status values | Valuation / Available / SSTC… | `practices.status` (explicit value map) |
| 7-step progression + dates | | `deals` + `deal_stage_events` |
| Journal entries (Call/Email/Note + author + timestamp) | | `journal_entries` (map legacy authors → profiles by name/email; unknown → "Legacy import" system author) |

Unmapped/unknown lookup values are **created as inactive lookup values** and reported —
never silently dropped.

## 9.4 Cleaning & dedupe

- Normalise emails/phones (E.164), postcodes; geocode addresses (batch, cached) for
  matching.
- Dedupe contacts on (email) then fuzzy (name + postcode) → merge candidates queue for
  human review in a small admin UI (approve merge / keep separate). Auto-merge only exact
  email duplicates within the same role.
- Consent: map legacy GDPR flags where present; absent → consent unknown (excluded from
  campaigns until confirmed) — plan a re-permission campaign at launch as the fix.

## 9.5 Validation report

Generated per run: per-entity counts (source vs staged vs loaded vs skipped+why), lookup
values created, dedupe merges, orphan links, top-20 row-level issues, and 20 random
side-by-side spot-check records (legacy ref + new URL) for manual verification against the
old system.

## 9.6 Cutover plan

1. Freeze week: full trial migration to staging; FTA team spot-checks + UAT.
2. Fix mapping issues; re-run (idempotent) until clean.
3. Go-live weekend: final export from iamproperty → production run → validation → team
   switches Monday. Old system read-only for a retention period.
4. Rollback: production data is only additive from migration; a failed run restores from
   the pre-run Supabase backup (take one immediately before).

## Acceptance criteria

- [ ] Dry run over full real export completes with a clean validation report.
- [ ] Spot-check: 20 random records match the old system (fields, journals, deal stages).
- [ ] Taxonomy mapping reviewed + signed off by FTA before production run.
- [ ] Re-running the migration produces zero duplicates (idempotency test).
