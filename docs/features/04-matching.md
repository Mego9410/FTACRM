# Phase 4 — Matching engine

Bidirectional matching between buyer criteria and available practices, with bulk actions.
Pure scoring logic lives in `lib/matching/` and is unit-tested exhaustively.

## 4.1 Buyer criteria (editor on the contact record, Buyer profile tab)

- Price range (min/max), timescale, finance status, buyer position.
- **Areas**: repeatable rows — either (a) place search → geocoded point + radius slider
  (miles), or (b) named UK region picker. Multiple areas OR together. Chips UI with edit/
  remove, mirroring the old system's pattern staff already know.
- Multi-select toggles (from lookups): specialisms, deal structures, funding types, tenure
  types. Empty selection = "any".
- Min surgeries, min turnover (optional).

## 4.2 Matching rules

A practice ↔ buyer pair matches when **all** specified constraints pass (unspecified =
pass):

| Constraint | Rule |
|---|---|
| Status | practice `available` (and buyer status Active) unless "include under offer" toggled |
| Price | practice asking within buyer min–max ±10% tolerance band (tolerance configurable) |
| Area | practice `location` within any buyer area radius / region (PostGIS `ST_DWithin`) |
| Funding / tenure / specialism / structure | practice value ∈ buyer's selected set |
| Surgeries / turnover | practice ≥ buyer minimum |

**Score** (0–100) for ranking, not gating: exact price fit > tolerance fit; distance decay
within radius; each optional facet matched adds weight; recency of buyer activity adds a
small boost. Return matches sorted by score with a per-facet breakdown ("Matched: area
(12 mi), NHS, price").

## 4.3 Match views

- **Practice → buyers** (`/practices/[id]` Matched buyers tab + `/matching`): ranked buyer
  cards/rows — name, temperature, score + facet chips, last contacted, latest activity.
  Excludes: suppressed/do-not-contact (shown greyed with reason), buyers already linked to
  this practice as offer-makers.
- **Buyer → practices** (contact record + `/matching` toggle): ranked practice cards with
  the design-system card styling.
- `/matching` standalone page: entity picker (choose practice or buyer), filter overrides
  (ignore price / ignore area toggles for exploratory searches), grid/list toggle.

## 4.4 Bulk actions (selection rail)

Row/card checkboxes maintain an "N selected" rail with:
- **Email selected** — opens campaign composer pre-segmented to the selection with the
  practice context loaded (Phase 5 dependency; before Phase 5, disabled with tooltip).
- **Book viewings** — batch-create viewing rows + calendar events.
- **Add task** — one task per selection or one shared task.
- **Mark not suitable** — records a `match_exclusions` row (buyer+practice, reason) so the
  pair stops surfacing; visible/undoable from either record.

## 4.5 Match freshness

- New practice → `available` triggers a background match run; owners of hot matching buyers
  get a notification ("14 buyers match P-2026-0142").
- New/updated buyer criteria triggers the reverse.
- No stored match table needed at this scale beyond `match_exclusions` — compute on read
  with proper indexes (GiST on locations, GIN on arrays); cache per-record for 5 min.

## Acceptance criteria

- [ ] Unit tests: every rule + tolerance + scoring edge cases (no criteria, multi-area,
      region vs radius, exclusions).
- [ ] Practice with seeded buyers returns correctly ranked matches < 500ms at 10k buyers.
- [ ] Exclusions persist and are undoable; do-not-contact buyers never actionable.
- [ ] Notifications fire on new-instruction match runs.
