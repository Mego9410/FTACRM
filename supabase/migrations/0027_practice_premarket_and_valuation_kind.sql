-- Pre-market tracking for the monthly figures report.
--
-- Practices gain Letter-of-Authority milestone dates and a couple of on-market
-- flags; valuations gain a "kind" so the report can split full valuations,
-- desktop valuations and updates. All optional / defaulted, so existing rows are
-- unaffected.

alter table public.practices
  add column if not exists loa_issued_at date,
  add column if not exists loa_received_at date,
  add column if not exists loa_lapsed_at date,
  add column if not exists sales_particulars_sent_at date,
  add column if not exists being_updated boolean not null default false,
  add column if not exists hd_paid boolean not null default false;

-- Valuation kind (full valuation / desktop / update) — lookup-driven.
insert into public.lookup_types (key, label, is_system) values
  ('valuation_kind', 'Valuation kinds', true)
on conflict (key) do nothing;

with t as (select id, key from public.lookup_types)
insert into public.lookup_values (lookup_type_id, value, sort_order, system_key)
select t.id, v.value, v.sort_order, v.system_key
from t
join (values
  ('valuation_kind', 'Valuation', 0, 'valuation'),
  ('valuation_kind', 'Desktop', 1, 'desktop'),
  ('valuation_kind', 'Update', 2, 'update')
) as v(key, value, sort_order, system_key) on v.key = t.key
where not exists (
  select 1 from public.lookup_values lv where lv.lookup_type_id = t.id and lv.system_key = v.system_key
);

alter table public.valuations
  add column if not exists kind_id uuid references public.lookup_values (id);

-- Default existing rows to the "Valuation" kind.
update public.valuations v
set kind_id = lv.id
from public.lookup_values lv
join public.lookup_types lt on lt.id = lv.lookup_type_id
where lt.key = 'valuation_kind' and lv.system_key = 'valuation' and v.kind_id is null;
