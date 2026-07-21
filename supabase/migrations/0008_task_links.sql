-- FTA CRM — 0008: multiple associations per task
-- A task can now be linked to several records (e.g. two buyers and a
-- practice). Each row links a task to exactly one record; the single
-- tasks.contact_id/practice_id/deal_id columns are kept as a denormalised
-- "primary" pointer for lightweight displays (dashboard, sidebar).

create table if not exists public.task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  practice_id uuid references public.practices (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(contact_id, practice_id, deal_id) = 1)
);

create index if not exists task_links_task_idx on public.task_links (task_id);
create index if not exists task_links_contact_idx on public.task_links (contact_id) where contact_id is not null;
create index if not exists task_links_practice_idx on public.task_links (practice_id) where practice_id is not null;
create index if not exists task_links_deal_idx on public.task_links (deal_id) where deal_id is not null;

alter table public.task_links enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'task_links' and policyname = 'task_links_select') then
    create policy task_links_select on public.task_links for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'task_links' and policyname = 'task_links_insert') then
    create policy task_links_insert on public.task_links for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'task_links' and policyname = 'task_links_delete') then
    create policy task_links_delete on public.task_links for delete to authenticated using (true);
  end if;
end $$;

-- Backfill existing single-column links into the join table.
-- Explicit uuid casts on the null placeholders so the UNION column types match.
insert into public.task_links (task_id, contact_id, practice_id, deal_id)
select id, contact_id, null::uuid, null::uuid from public.tasks where contact_id is not null
union all
select id, null::uuid, practice_id, null::uuid from public.tasks where practice_id is not null
union all
select id, null::uuid, null::uuid, deal_id from public.tasks where deal_id is not null;
