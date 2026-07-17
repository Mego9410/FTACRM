# Phase 3 — Deals (sales progression)

Non-negotiable #4. A deal is born when an offer is accepted and tracks the transaction to
completion through a dated stage tracker. The old system's 7-step horizontal tracker is the
mental model staff live in — keep it, make it faster.

## 3.1 Stages

Seeded defaults (admin-renameable, extendable via Control Centre → Deal stages):

1. Offer accepted → 2. Solicitors instructed → 3. Searches ordered → 4. Finance offer →
5. Searches back → 6. Contracts exchanged → 7. Completion

- Stage 1 auto-achieved (dated) on deal creation from the accepted offer.
- Stages are dated **achievements**, not a strict one-way ladder: a stage can be marked
  achieved out of order (real transactions are messy), un-achieved with confirm (audited),
  and back-dated. `current_stage` = first unachieved stage.
- Marking Completion prompts for completion date + final price → deal `completed`,
  practice → `completed`, congratulatory system journal entry.

## 3.2 Deal list (`/deals`) — the progression board

Default view mirrors the old horizontal-tracker list, modernised:

- Each row: practice title + ref, buyer name, seller name, agreed price, owner avatar,
  target completion, **7-segment tracker** (green = achieved with date on hover, amber
  pulse = current, grey = upcoming), last-activity age chip (amber >7 days, red >14 days
  — thresholds configurable), status badge for completed/fallen-through.
- Filters: status (in progress / completed / fallen through / on hold), owner, branch,
  stage, "stalled only", date ranges. Sort: closest to completion, last activity, price,
  oldest. Search by practice/buyer/ref.
- Optional **Kanban view**: columns per stage, cards draggable (drag = mark stage achieved,
  with confirm + date picker defaulting today).

## 3.3 Deal record (`/deals/[id]`)

**Header**: practice chip, buyer + seller chips, both solicitor chips, agreed price, owner,
status, target completion, tracker rendered large.

**Tabs**:
- **Progression** — the tracker with per-stage: achieved date, recorded-by, note; inline
  mark/unmark; milestone notes ("searches delayed — local authority backlog"). Below:
  key-dates panel (offer accepted, target completion, days in progress, days since last
  activity).
- **People** — all parties incl. solicitor contact details (click-to-call/email), quick
  "chase" action → logs a call/email intent as a task.
- **Journal / Documents / Checklist / Audit** — shared modules (deal-scoped). Seed a
  "Sales progression" checklist template (memorandum of sale sent, AML complete, CQC
  registration underway, bank valuation booked, …) — FTA to refine values in admin.

## 3.4 Fall-through & holds

- **Fall through**: reason (lookup) + note required → deal `fallen_through`, practice back
  to `available` (prompt: relist? re-run matching?), offer → fallen-through, journal +
  notifications to owner/manager.
- **On hold**: pauses stalled-detection; requires note; badge on lists.

## 3.5 Stalled-deal detection

Daily cron: deals in progress with `last_activity_at` older than threshold get flagged +
owner notified; feeds the "Stalled deals" smart list and the AI deal-risk feature (Phase 8).

## Acceptance criteria

- [ ] Accepting an offer creates a deal with stage 1 dated; tracker renders on list + record.
- [ ] Stages mark/unmark/backdate with audit trail; completion cascades to practice.
- [ ] Fall-through returns the practice to market and captures the reason.
- [ ] Board filters + Kanban drag work; 420 seeded deals render smoothly (virtualised).
- [ ] Stalled flags + notifications fire from the cron.
