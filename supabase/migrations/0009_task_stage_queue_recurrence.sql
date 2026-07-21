-- FTA CRM — 0009: HubSpot-style task workspace fields
-- Adds a task stage (pipeline), an optional start date, a queue label and a
-- repeat interval. `status` (open/done) is kept in sync with `stage` so the
-- existing buckets, dashboard and reminders keep working unchanged.

alter table public.tasks
  add column if not exists stage text not null default 'not_started'
    check (stage in ('not_started', 'in_progress', 'waiting', 'completed', 'deferred')),
  add column if not exists start_at timestamptz,
  add column if not exists queue text,
  add column if not exists recurrence text
    check (recurrence in ('daily', 'weekly', 'monthly'));

-- Seed stage from the existing binary status for older rows.
update public.tasks set stage = 'completed' where status = 'done' and stage <> 'completed';
update public.tasks set stage = 'not_started' where status = 'cancelled' and stage = 'not_started';

create index if not exists tasks_stage_idx on public.tasks (assignee_id, stage);
