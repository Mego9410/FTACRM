-- Calendar recurrence + reminders -------------------------------------------
-- Events can now repeat on a rule, and carry one or more reminder offsets
-- (minutes before the start). Both are optional; a plain one-off event leaves
-- recurrence null and reminder_minutes empty.

alter table public.calendar_events
  add column if not exists recurrence jsonb,
  add column if not exists reminder_minutes int[] not null default '{}';

-- Recurrence rule shape (jsonb):
--   { "freq": "daily"|"weekly"|"monthly",
--     "interval": 1,
--     "byday": [1,3,5],                      -- weekly only, 0=Sun..6=Sat
--     "end": { "type": "never" }
--          | { "type": "on", "date": "2026-12-31" }
--          | { "type": "after", "count": 10 } }
