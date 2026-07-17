# Phase 6 — Calendar, tasks & notifications

Non-negotiable #5: firm-wide calendar management, plus the task/notification layer that
feeds My Day.

## 6.1 Shared calendar (`/calendar`)

- Month / week / day views, today button, print stylesheet. (Library: FullCalendar or
  Schedule-X, restyled to FTA tokens — pick whichever integrates cleanest with React 19.)
- **Team overlay rail**: checklist of teammates with their `calendar_color` swatch —
  show/hide per person, "just me", "everyone". Persisted per user.
- Colour coding: event **type** sets the fill (lookup colours); the **owner** sets a left
  accent stripe when multiple calendars overlaid — legible in both modes.
- Filters: event type, branch; hide-cancelled toggle.
- Event create/edit modal: title, type, start/end (+ all-day), location, body, attendees
  (staff multi-select + optional contact), record links (practice/contact/deal pickers),
  visibility (private = busy-only to others).
- Record-linked events deep-link back (valuation/viewing events auto-created by those
  modules appear with a small link icon, per the old system's affordance).
- Double-book warning (soft, non-blocking) when an attendee overlaps.

## 6.2 Two-way Outlook sync (Graph)

Uses the same `graph_connections` as mail (Phase 5 built the OAuth + webhook + renewal
infrastructure; this phase adds the calendar resource).

**CRM → Outlook**: creating/updating/cancelling a CRM event pushes to each **staff
attendee's** default Outlook calendar (organiser's copy via Graph create-event with
attendees, letting Exchange fan out invites). Store `graph_event_id` + `iCalUId`.

**Outlook → CRM**: calendar webhook + delta pulls changes. Outlook-originated events import
as `external_source='outlook'` (visible on overlays, editable only in Outlook — banner
explains). Edits made in Outlook to CRM-originated events sync back (time/title/cancel).

**Rules**:
- Dedupe on `iCalUId`; ignore echoes of our own pushes (compare change keys).
- Conflict policy: last writer wins; every remote overwrite writes an audit entry.
- Private Outlook events import as busy-time blocks (no title) respecting sensitivity.
- Sync status surfaced per event (subtle icon on error) and per user in settings.
- Users without a connected account still fully use the internal calendar.

## 6.3 Tasks

- Task list (`/dashboard` widget + `/tasks`): due today / overdue / upcoming buckets,
  filter by assignee (managers see team), category, linked record.
- Create from anywhere (quick-add, record pages, journal follow-up button: "log call →
  create follow-up task").
- Due tasks generate notifications (in-app; daily digest email via Resend optional toggle).

## 6.4 Notifications

- Bell menu (Realtime-fed): unread badge, mark read, clear all, deep links.
- Sources: task due/assigned, deal stalled, campaign finished, new matching buyers,
  viewing feedback overdue, sync errors, @mentions in journal notes (add mention support
  to Tiptap composer).
- Per-user notification preferences (per kind: in-app / email / off).

## 6.5 My Day (`/dashboard`)

- Greeting, today's events (from overlay of own calendar), open tasks, "needs attention"
  strip (stalled deals owned, feedback overdue, contracts expiring), recent activity on
  owned records, quick-add. AI daily brief slot (Phase 8).

## Acceptance criteria

- [ ] Team overlay with colours; per-user persistence; month/week/day correct across DST.
- [ ] CRM event with 2 staff attendees appears in both Outlooks; Outlook edit syncs back.
- [ ] Outlook-created event appears in CRM within webhook latency (<2 min).
- [ ] Valuations and viewings create linked events; cancelling a viewing cancels the event.
- [ ] Tasks + notifications flow end to end; My Day reflects live state.
