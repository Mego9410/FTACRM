-- FTA CRM — 0007: task reminders
-- Adds a reminder timestamp and a "reminded" marker to tasks so a cron can
-- fire one notification per task when its reminder falls due. The partial
-- index keeps the due-reminder scan cheap (only pending reminders indexed).

alter table public.tasks
  add column if not exists reminder_at timestamptz,
  add column if not exists reminded_at timestamptz;

create index if not exists tasks_reminder_idx
  on public.tasks (reminder_at)
  where reminder_at is not null and reminded_at is null;
