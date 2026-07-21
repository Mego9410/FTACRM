-- FTA CRM — 0006: HubSpot-style task fields
-- Adds a task type (to-do / call / email) and a priority to tasks, plus
-- indexes so a record's Tasks tab can filter quickly. Follow-up tasks are
-- modelled as ordinary tasks created on completion (no extra column needed).

alter table public.tasks
  add column if not exists task_type text not null default 'todo'
    check (task_type in ('todo', 'call', 'email')),
  add column if not exists priority text
    check (priority in ('low', 'medium', 'high'));

create index if not exists tasks_contact_idx on public.tasks (contact_id) where contact_id is not null;
create index if not exists tasks_practice_idx on public.tasks (practice_id) where practice_id is not null;
create index if not exists tasks_deal_idx on public.tasks (deal_id) where deal_id is not null;
