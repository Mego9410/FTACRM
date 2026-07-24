-- Deal stages become an editable firm-wide template (Control Centre), and each
-- deal can add its own extra stages since every transaction is a little
-- different. Template achievements still use deal_stage_events (unchanged, so
-- reporting is unaffected); per-deal extras live in deal_custom_stages.

alter table public.deal_stages add column if not exists is_active boolean not null default true;

create table if not exists public.deal_custom_stages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  label text not null,
  sort_order numeric not null default 0,   -- numeric so a stage can slot between template steps
  is_terminal boolean not null default false,
  achieved_on date,
  achieved_by uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists deal_custom_stages_deal_idx on public.deal_custom_stages (deal_id);
drop trigger if exists deal_custom_stages_updated on public.deal_custom_stages;
create trigger deal_custom_stages_updated before update on public.deal_custom_stages
  for each row execute function public.set_updated_at();

alter table public.deal_custom_stages enable row level security;
drop policy if exists deal_custom_stages_select on public.deal_custom_stages;
create policy deal_custom_stages_select on public.deal_custom_stages for select to authenticated using (true);
drop policy if exists deal_custom_stages_write on public.deal_custom_stages;
create policy deal_custom_stages_write on public.deal_custom_stages for all to authenticated using (true) with check (true);
