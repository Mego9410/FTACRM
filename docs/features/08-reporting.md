# Phase 7 — Reporting & dashboards

Leadership visibility (period-vs-period KPIs) + operational visibility (activity feed and
smart lists). Follow the `dataviz` conventions: calm, branded, no chart junk.

## 7.1 Management dashboard (`/reporting`)

- Filter bar: current period + comparison period (presets: this month vs last, this quarter
  vs last, YTD vs prior YTD, custom), branch, agent.
- KPI tiles (current value, vs-previous delta with up/down arrow — green/red by direction):
  - **Instructions** — practices instructed (count + total asking value)
  - **Valuations** — booked / completed / conversion to instruction %
  - **Gross sales** — deals completed (count + £ value + total fees)
  - **Pipeline** — live deals (units + fee value at agreed prices)
  - **Average fee %** and **average sale price**
  - **Fall-through rate** — fell through / (completed + fell through)
  - **Time to complete** — median days offer-accepted → completion
  - **Buyer pool** — active buyers, new this period, contacted this period
- Charts: completions by month (12-mo bar), pipeline by stage (funnel/stacked), instructions
  vs completions trend. Per-agent table (instructions, deals, completions, fees) for
  manager+ roles.
- Export: CSV per widget; "email this dashboard" (PDF snapshot via Resend) later/optional.
- Data source: direct aggregate queries first; move hot queries to `report_snapshots`
  nightly rollups only if measured slow.

## 7.2 Activity feed (`/reporting/activity`)

Firm-wide journal stream (the old Branch Activity, but fast): all `journal_entries` with
author chips filter, type filter (call/note/email/system), date range, search, linked-record
chips. Server-paginated infinite scroll; must stay fast at millions of rows (index-backed,
no offset pagination — keyset).

## 7.3 Smart lists (saved views)

- System-seeded, admin-editable, shown on Sales dashboard rail + subscribable to My Day:
  - Agency contracts expiring (≤60 days)
  - Buyers not contacted (≥90 days, active)
  - Sellers not contacted (≥30 days, live listing)
  - Valuations awaiting outcome
  - Viewings needing feedback
  - Unconfirmed upcoming viewings
  - Pending offers
  - Stalled deals
  - New buyers without criteria
- Any user can save a personal view from any filtered list; counts cached hourly.

## 7.4 Exports

Every DataTable exports its current filter to CSV (respecting role permissions). A
Control Centre "full export" (admin only) dumps entity CSVs for backup/BI.

## Acceptance criteria

- [ ] KPIs verified against hand-computed values on seeded data, including period deltas.
- [ ] Branch/agent slicing correct; agents see own numbers, managers see all.
- [ ] Activity feed sub-second at 1M seeded journal rows.
- [ ] All nine system smart lists return correct membership on seeded fixtures.
