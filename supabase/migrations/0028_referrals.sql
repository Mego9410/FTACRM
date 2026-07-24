-- Referrals: track income-generating referrals FTA makes to partners/services,
-- rolled up per category in the monthly figures report.

insert into public.lookup_types (key, label, is_system) values
  ('referral_type', 'Referral types', false)
on conflict (key) do nothing;

with t as (select id, key from public.lookup_types)
insert into public.lookup_values (lookup_type_id, value, sort_order, system_key)
select t.id, v.value, v.sort_order, v.system_key
from t
join (values
  ('referral_type', 'EPCs', 0, 'epcs'),
  ('referral_type', 'Capital Allowances', 1, 'capital_allowances'),
  ('referral_type', 'Mortgages', 2, 'mortgages'),
  ('referral_type', 'CQC/Compliance', 3, 'cqc_compliance'),
  ('referral_type', 'Wills/LPAs', 4, 'wills_lpas'),
  ('referral_type', 'Insurances', 5, 'insurances'),
  ('referral_type', 'Pensions/Tax Planning/Investment', 6, 'pensions_tax_investment'),
  ('referral_type', 'Commercial Loans', 7, 'commercial_loans'),
  ('referral_type', 'Membership Upgrades', 8, 'membership_upgrades'),
  ('referral_type', 'Buxton & Coates', 9, 'buxton_coates'),
  ('referral_type', 'Howman Solicitors', 10, 'howman_solicitors'),
  ('referral_type', 'Shakespeare Martineau', 11, 'shakespeare_martineau'),
  ('referral_type', 'Acuity Law', 12, 'acuity_law'),
  ('referral_type', 'Berman', 13, 'berman'),
  ('referral_type', 'Other Sols', 14, 'other_sols'),
  ('referral_type', 'The Principals Club', 15, 'principals_club')
) as v(key, value, sort_order, system_key) on v.key = t.key
where not exists (
  select 1 from public.lookup_values lv where lv.lookup_type_id = t.id and lv.system_key = v.system_key
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referral_type_id uuid not null references public.lookup_values (id),
  practice_id uuid references public.practices (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  referred_on date not null default current_date,
  value numeric(12, 2),
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists referrals_type_idx on public.referrals (referral_type_id, referred_on);
create index if not exists referrals_date_idx on public.referrals (referred_on);
create index if not exists referrals_practice_idx on public.referrals (practice_id);

drop trigger if exists referrals_updated on public.referrals;
create trigger referrals_updated before update on public.referrals
  for each row execute function public.set_updated_at();

-- Ordinary business data: permissive RLS (staff read/write), matching the other
-- business tables — access is gated in the server actions.
alter table public.referrals enable row level security;

drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals for select to authenticated using (true);
drop policy if exists referrals_insert on public.referrals;
create policy referrals_insert on public.referrals for insert to authenticated with check (true);
drop policy if exists referrals_update on public.referrals;
create policy referrals_update on public.referrals for update to authenticated using (true) with check (true);
drop policy if exists referrals_delete on public.referrals;
create policy referrals_delete on public.referrals for delete to authenticated using (true);
