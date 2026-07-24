-- Two-level referrals: a category (EPCs, Mortgages, Solicitors, …) and a specific
-- company under it (Buxton & Coates, …). Staff drill category → company when
-- logging, and can add a company inline. The named solicitor firms that were flat
-- referral_type values become companies under a new "Solicitors" category.

-- 1. Category lookup.
insert into public.lookup_types (key, label, is_system) values
  ('referral_category', 'Referral categories', false)
on conflict (key) do nothing;

with t as (select id, key from public.lookup_types)
insert into public.lookup_values (lookup_type_id, value, sort_order, system_key)
select t.id, v.value, v.sort_order, v.system_key
from t
join (values
  ('referral_category', 'EPCs', 0, 'epcs'),
  ('referral_category', 'Capital Allowances', 1, 'capital_allowances'),
  ('referral_category', 'Mortgages', 2, 'mortgages'),
  ('referral_category', 'CQC/Compliance', 3, 'cqc_compliance'),
  ('referral_category', 'Wills/LPAs', 4, 'wills_lpas'),
  ('referral_category', 'Insurances', 5, 'insurances'),
  ('referral_category', 'Pensions/Tax Planning/Investment', 6, 'pensions_tax_investment'),
  ('referral_category', 'Commercial Loans', 7, 'commercial_loans'),
  ('referral_category', 'Membership Upgrades', 8, 'membership_upgrades'),
  ('referral_category', 'Solicitors', 9, 'solicitors'),
  ('referral_category', 'The Principals Club', 10, 'principals_club')
) as v(key, value, sort_order, system_key) on v.key = t.key
where not exists (
  select 1 from public.lookup_values lv where lv.lookup_type_id = t.id and lv.system_key = v.system_key
);

-- 2. Companies under a category.
create table if not exists public.referral_companies (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.lookup_values (id),
  name text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists referral_companies_cat_name_idx
  on public.referral_companies (category_id, lower(name));

drop trigger if exists referral_companies_updated on public.referral_companies;
create trigger referral_companies_updated before update on public.referral_companies
  for each row execute function public.set_updated_at();

alter table public.referral_companies enable row level security;
drop policy if exists referral_companies_select on public.referral_companies;
create policy referral_companies_select on public.referral_companies for select to authenticated using (true);
drop policy if exists referral_companies_insert on public.referral_companies;
create policy referral_companies_insert on public.referral_companies for insert to authenticated with check (true);
drop policy if exists referral_companies_update on public.referral_companies;
create policy referral_companies_update on public.referral_companies for update to authenticated using (true) with check (true);
drop policy if exists referral_companies_delete on public.referral_companies;
create policy referral_companies_delete on public.referral_companies for delete to authenticated using (true);

-- Seed the known solicitor firms under the Solicitors category.
insert into public.referral_companies (category_id, name)
select cat.id, c.name
from public.lookup_values cat
join public.lookup_types lt on lt.id = cat.lookup_type_id and lt.key = 'referral_category'
join (values ('Buxton & Coates'), ('Howman Solicitors'), ('Shakespeare Martineau'),
             ('Acuity Law'), ('Berman'), ('Other Sols')) as c(name) on true
where cat.system_key = 'solicitors'
  and not exists (
    select 1 from public.referral_companies rc where rc.category_id = cat.id and lower(rc.name) = lower(c.name)
  );

-- 3. Point referrals at category + company; keep referral_type_id (now nullable) for legacy rows.
alter table public.referrals
  add column if not exists category_id uuid references public.lookup_values (id),
  add column if not exists company_id uuid references public.referral_companies (id);
alter table public.referrals alter column referral_type_id drop not null;

create index if not exists referrals_category_idx on public.referrals (category_id, referred_on);

-- Backfill category from the old flat referral_type by matching system_key
-- (service categories map straight across; the named-solicitor values map to the
-- Solicitors category).
update public.referrals r
set category_id = cat.id
from public.lookup_values old
join public.lookup_types lto on lto.id = old.lookup_type_id and lto.key = 'referral_type'
join public.lookup_values cat on cat.system_key = old.system_key
join public.lookup_types ltc on ltc.id = cat.lookup_type_id and ltc.key = 'referral_category'
where r.referral_type_id = old.id and r.category_id is null;

update public.referrals r
set category_id = cat.id
from public.lookup_values old
join public.lookup_types lto on lto.id = old.lookup_type_id and lto.key = 'referral_type'
join public.lookup_values cat on cat.system_key = 'solicitors'
join public.lookup_types ltc on ltc.id = cat.lookup_type_id and ltc.key = 'referral_category'
where r.referral_type_id = old.id and r.category_id is null
  and old.system_key in ('buxton_coates', 'howman_solicitors', 'shakespeare_martineau', 'acuity_law', 'berman', 'other_sols');
