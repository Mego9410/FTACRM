# Phase 2 — Practices

The central listing entity: a dental practice being valued/sold. Non-negotiable #1 (seller +
buyer profiles logged to a practice) lives here.

## 2.1 List (`/practices`)

- Card grid **and** table toggle (grid mirrors the design-system practice card: grey fill,
  status pill, funding pill, gold asking price, "View details →").
- Filters: status, funding type, tenure, specialism, price range, surgeries, owner, branch,
  region, instructed date range, contract-expiring-within. Search: ref/name/address/postcode.
- Status tabs with counts: All / Valuation / Available / Under offer / Completed / Withdrawn.

## 2.2 Practice record (`/practices/[id]`)

**Header**: display title + (if permitted) trading name, address, status pill, asking price
(gold), key stats strip (surgeries, funding pill, tenure, turnover), primary seller chip
(→ contact), owner + branch + status selectors, ref, quick actions (log call, note, task,
event, book viewing, add offer).

**Tabs**:
- **Details** — address (+ map thumbnail), pricing (prefix, asking price, fees), dental
  profile (funding, tenure, specialisms, deal structures, surgeries, UDAs, turnover, EBITDA,
  staff), key dates (instructed, contract expiry — expiry within 60 days shows a warning
  pill), confidentiality toggle, description (rich text), withdrawal (reason + date).
- **People** ★ — the `practice_contacts` manager. Sections: **Sellers** (primary star),
  **Interested buyers** (auto-added by viewings/offers, manually addable), **Solicitors &
  professionals**. Each row: contact chip, role, notes, added date, unlink. "Add person" →
  search existing contacts or create inline.
- **Valuations** — list of valuation appointments + detail: valuers, appointment date/time
  (creates linked calendar event), booked/confirmed toggles, price from/to, seller
  expectation, suggested price, fee, outcome, per-valuation checklist.
- **Viewings** — table with status chips (requested/confirmed/completed/cancelled/no-show),
  add viewing (buyer + datetime → calendar event + attendees), feedback capture; overdue
  feedback flag (completed >48h without feedback).
- **Offers** — table with status chips + live counts; add offer (buyer, amount, conditions,
  finance status). **Accept** action: confirm dialog → offer accepted, others → declined
  (with per-offer courtesy note), practice → `under_offer`, deal auto-created, journal +
  audit entries. Fall-through handled from the deal (Phase 3).
- **Marketing** — display title, marketing description, confidential-fields checklist
  (what may appear in outbound emails), media gallery (photos/floorplans; confidential
  flag per asset).
- **Matched buyers** — Phase 4 embed.
- **Documents / Journal / Checklist / Audit** — shared modules.

## 2.3 Status lifecycle

`valuation → preparing → available → under_offer → sold_stc → completed`, with `withdrawn`
reachable from any pre-completion state (requires reason). Transitions only via server
action, each writing journal (system entry) + audit. Status drives: matching eligibility
(only `available` practices match), campaign inclusion, dashboards.

## 2.4 Reference & numbering

`P-{year}-{seq}` assigned on create, immutable, shown everywhere, searchable.

## Acceptance criteria

- [ ] Full create → value → instruct → list flow with all tabs functional.
- [ ] Sellers, buyers, solicitors attach to a practice with roles; header shows primary seller.
- [ ] Booking a viewing creates a calendar event and adds the buyer to People.
- [ ] Accepting an offer flips status, declines rivals, and creates a deal.
- [ ] Confidentiality: a confidential practice never leaks name/address into
      marketing-context renders (unit test the merge-tag context builder).
