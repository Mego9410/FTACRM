# FTA CRM — Single-Source-of-Truth review

A read-only review of the schema for places where the **same live fact is stored in more than one editable place** and can therefore drift out of sync. No schema was changed — this is for your decision.

First, a distinction that matters, because "store each fact once" has three different answers depending on the kind of data:

- **True duplication** — the same *current* fact has two writable homes that can disagree. **These are the real problem** and are worth fixing.
- **Derived caches** — a value computed from other rows, stored for speed (counts, "last activity"). Not wrong, but it *can* drift if the refresh logic misses a path. Fix = compute on read, or maintain by trigger.
- **Deliberate snapshots** — a frozen copy that is *supposed* to stop tracking the live value (the email address a campaign was sent to; the wording that went out). These **should** stay duplicated — the point is a permanent record. Leave them; just label them.

Findings are grouped by those three, then a fourth group of dead columns from removed features.

---

## A. True duplication — fix these

### A1. Deal parties are copied from their real homes and then drift ⭐ the main one
`deals.buyer_contact_id`, `seller_contact_id`, `buyer_solicitor_id`, `seller_solicitor_id`.

Who the buyer / seller / solicitors are already lives elsewhere:
- **Buyer** → `offers.buyer_contact_id` (the offer that was accepted). `acceptOffer` copies it into `deals.buyer_contact_id`.
- **Seller** → `practice_contacts` (role `seller`). `acceptOffer` reads the primary seller and copies it into `deals.seller_contact_id`.
- **Solicitors** → `practice_contacts` has roles `buyer_solicitor` / `seller_solicitor`, **and** the deal's People tab writes `deals.buyer_solicitor_id` / `seller_solicitor_id` directly (`updateDealFields`). **Two UIs, two homes** — change the solicitor on the practice's People tab and the deal still shows the old one, or vice-versa.

The `data-model.md` note calls `buyer_contact_id, seller_contact_id` *"denormalised for list speed"* — so it was a deliberate copy, but nothing keeps the copy in step with the source after creation.

**Recommendation:** pick one home per fact.
- Buyer of a deal = the accepted offer's buyer → derive via `deal.offer_id → offers.buyer_contact_id`; drop `deals.buyer_contact_id`.
- Seller / solicitors of a deal = the practice's `practice_contacts` rows → read from there; drop `deals.seller_contact_id`, `buyer_solicitor_id`, `seller_solicitor_id`, and remove the second editor on the deal People tab.
- If the list-speed argument still bites, keep the columns but make them **trigger-maintained** from the source (never hand-edited), so there is still one writer.

### A2. `deals.agreed_price` duplicates `offers.amount`
The agreed price is the accepted offer's amount, copied at `acceptOffer`. If the offer is later corrected, the deal keeps the stale figure. **Recommendation:** derive from `deal.offer_id → offers.amount`, or trigger-maintain.

---

## B. Derived caches — keep, but make them single-writer

These are values computed from other rows and stored on the parent. They're legitimate for speed but each is a place that can drift; today most are refreshed by app code, which is the fragile part (miss one write path and it's stale).

| Column(s) | Real source | Today |
|---|---|---|
| `deals.current_stage_id` | first `deal_stages` with no `deal_stage_events` row | recomputed by `refreshCurrentStage()` after some writes |
| `deals.last_activity_at` | latest activity on the deal | set by hand in various actions |
| `deals.completed_at`, `fell_through_at` | the terminal `deal_stage_events` / status change | set alongside status |
| `contacts.last_contacted_at` | latest call/email in `journal_entries` | set by hand |
| `campaigns.recipient_count`, `sent_count`, `delivered_count`, `open_count`, `click_count`, `bounce_count`, `unsubscribe_count` | `campaign_recipients` + `email_events` | incremented by dispatch code (email is dormant, so mostly zero today) |
| `saved_views.cached_count`, `cached_at` | running the saved-view query | explicit, clearly-labelled cache — fine as-is |

**Recommendation:** for each, either (a) compute on read (a view or a query) and drop the stored column, or (b) keep the column but move maintenance into a **DB trigger** on the source table so there's exactly one writer and no missed path. The campaign counters are the best candidates to derive-on-read (they're pure aggregates); `current_stage_id` is a good trigger candidate. `saved_views.cached_count` is already a self-aware cache — leave it.

## B-note. `practices.status` vs `deals.status`
A practice going `under_offer → sold_stc → completed` mirrors the deal's `in_progress → completed`. `acceptOffer`, `markStage` and `setDealStatus` update the practice status to match. These are arguably **two different facts** (the *listing* state vs the *transaction* state), so this isn't strictly duplication — but the overlap (`sold_stc`/`completed`) is a coupling worth documenting so the two can't silently disagree. **Recommendation:** state explicitly that `deals.status` is the source for anything sale-progression, and `practices.status` is a listing-lifecycle field driven from it.

---

## C. Deliberate snapshots — leave duplicated (just document)

These *should* keep their own copy; tracking the live value would corrupt the record:

- `campaign_recipients.email` — the address the mail actually went to ("frozen at send", per the doc). Correct.
- `campaigns.subject`, `body_html` — exactly what was sent. Correct.
- `notifications.body`, `ai_suggestions.payload` — point-in-time message text. Correct.
- `audit_log` old/new values — the whole purpose is an immutable copy. Correct.
- System `journal_entries` bodies (e.g. "Status changed … by X") — a historical statement, not a live mirror. Correct.

No change — I'd just add a one-line "snapshot, intentional" comment to each in `data-model.md` so a future reader doesn't "helpfully" normalise them away.

---

## D. Dead columns from removed features — remove to cut confusion

Not multiple-source problems, but they *are* extra places data can be written that no longer has a meaning, which is exactly the "too many places" smell you're describing:

- `owner_id` on `contacts`, `practices`, `deals` — the "owner of a record" concept was removed from the product. Columns remain and are still written in a couple of fallbacks.
- `branch_id` on `contacts`, `practices`, `profiles` **and the whole `branches` table** — "we don't have branches."
- `practices.deal_structure_ids` (+ the `deal_structure` lookup type) — the Deal-structure selector was removed.
- `practices.confidential` — the Confidential toggle was removed; the public page now hard-hides address/name regardless.

**Recommendation:** drop these columns/tables in a migration (or, if you'd rather be cautious, mark them reserved and stop writing them). Removing them guarantees no one stores an "owner" or "branch" in a place the UI no longer shows.

## E. Minor / style notes (no action needed)
- `practices.specialism_ids uuid[]` — a many-to-many stored as an array of lookup ids rather than a join table. Single home, so fine; just a style choice.
- `contacts.organisation_id` vs `contact_links` — an employer link could in principle be expressed in both; today only one is used. Worth a glance if you build org hierarchies later.

---

## Suggested order of work (if you want me to implement)

1. **A1 + A2 — deal parties & price.** Highest value: it's the one place two humans can enter conflicting data. Decide "derive vs trigger-maintain", then one migration + read-path changes + remove the duplicate editor. (M–L effort.)
2. **D — drop dead columns.** Quick, low-risk once you confirm each feature is really gone. (S effort, needs a migration.)
3. **B — caches.** Convert campaign counters to derive-on-read; make `current_stage_id`/`last_contacted_at` trigger-maintained. (M effort.)
4. **C — documentation only.** Annotate the snapshots in `data-model.md`. (S.)

Everything here is a schema change, so: I won't touch anything until you say go, each change ships as a numbered migration with up/down that I validate on local Postgres, and **you** apply it to Supabase (same as the security migration).

**Two decisions I need from you to start:**
- **A1:** for deal buyer/seller/solicitors — *derive on read* (cleanest, drops the columns) or *keep columns but trigger-maintain them* (preserves list-query speed)?
- **D:** are `owner`, `branch`, `deal_structure`, and `confidential` all confirmed gone for good, so I can drop them?
