-- Firm-wide settings (singleton). Company identity, default fees and email
-- sender identity used across documents and outbound mail. Managed in
-- Control Centre → Firm settings.

create table if not exists public.firm_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'Frank Taylor & Associates',
  trading_name text,
  address text,
  phone text,
  email text,
  website text,
  logo_url text,
  default_fee_percent numeric(5, 2),
  default_min_fee text,                 -- display string, e.g. "£12,000"
  email_from text,                      -- e.g. "FTA <no-reply@ft-associates.com>"
  email_reply_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists firm_settings_updated on public.firm_settings;
create trigger firm_settings_updated before update on public.firm_settings
  for each row execute function public.set_updated_at();

alter table public.firm_settings enable row level security;
drop policy if exists firm_settings_select on public.firm_settings;
create policy firm_settings_select on public.firm_settings for select to authenticated using (true);
drop policy if exists firm_settings_write on public.firm_settings;
create policy firm_settings_write on public.firm_settings for all to authenticated using (true) with check (true);

-- Seed the single row if none exists.
insert into public.firm_settings (company_name, default_min_fee, default_fee_percent)
select 'Frank Taylor & Associates', '£12,000', 3
where not exists (select 1 from public.firm_settings);
