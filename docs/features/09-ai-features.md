# Phase 8 — AI features (Anthropic API)

Principles: **assistive, never autonomous** — AI drafts and summarises; humans review and
send. Every call logged to `ai_jobs` (cost + reproducibility). Clear "AI-generated" labels.
Graceful degradation: AI unavailable → feature hides, core CRM unaffected. Server-side only.

Models: `claude-sonnet-5` for drafting/reasoning; `claude-haiku-4-5` for classification and
high-volume summarisation. Centralise in `lib/ai/` with per-feature prompt builders; keep the
FTA voice guide (from `design-system/README.md` content fundamentals) in the system prompt
for anything that writes copy: calm, reassuring, seller-first, sentence case, no emoji, no
hype.

## 8.1 Record catch-up summaries
"Catch me up" button on contact / practice / deal headers → summary panel: who they are,
relationship history, current state, open threads, suggested next action. Cached in
`ai_summaries` with a journal watermark — regenerates only when new activity exists. Input:
record fields + last N journal entries + open tasks + deal state.

## 8.2 Call note summarisation & action extraction
After saving a call note (or pasting a raw transcript/ramble), "Tidy with AI": returns a
structured summary (outcome, key points, commitments) + proposed follow-up tasks with due
dates. User accepts/edits; accepted tasks are created and attributed "via AI, approved by
{user}".

## 8.3 Drafting assistant
- **One-to-one email**: on the composer — "draft a reply" / "draft an intro" given the
  contact context + thread + a short instruction; output editable before send.
- **Campaign copy**: given a practice + audience segment, draft the new-instruction email
  in FTA voice with merge tags in place; never invents facts — pulls only from record
  fields; confidential fields excluded by the context builder (same one used for merge
  tags — unit-tested).

## 8.4 Natural-language search
Global-search escape hatch: "buyers in the North West up to £800k looking for NHS practices
not contacted in 3 months" → tool-use call that emits a structured filter (the same
`saved_views.definition` format) → runs the real query and shows the applied-filter chips
(transparent + correctable, no hallucinated results). Offer "save as view".

## 8.5 Deal risk & stalled-deal briefs
The daily stalled-deal cron enriches flags with Haiku: reads the deal journal and produces a
one-line "why it's stuck + suggested chase" on the notification and the deal header
("Awaiting searches 24 days; last contact from buyer solicitor 2 weeks ago — chase X").

## 8.6 Inbound email triage
On synced inbound mail: classify (new enquiry / viewing request / offer discussion / legal
progress / unsubscribe request / other) + urgency. Classification stored on
`email_messages.meta`, drives journal badge + optional notification rules (e.g. "offer
discussion" pings the practice owner). Low confidence → no label.

## 8.7 Meeting prep briefs
Calendar events linked to a record get a "prep brief" action (and auto-attach to the
morning digest): who you're meeting, history, live matters, suggested talking points.

## 8.8 Daily digest (opt-in)
07:30 email per user: today's events with prep links, due tasks, stalled deals, overnight
inbound needing attention. Composed with Haiku, sent via Resend.

## Rollout order
8.1 → 8.2 → 8.3 (highest value, lowest risk) then 8.4–8.8. Ship behind per-feature flags in
Control Centre; admin can disable any AI feature org-wide.

## Acceptance criteria

- [ ] Summaries factually grounded (spot-check harness: summary claims traceable to journal).
- [ ] No AI output sent externally without explicit user action; labels present.
- [ ] `ai_jobs` records model, tokens, latency for every call; admin cost view.
- [ ] Confidential practice fields never appear in AI-drafted external copy (tests).
- [ ] API outage: features hide gracefully, zero impact on core flows.
