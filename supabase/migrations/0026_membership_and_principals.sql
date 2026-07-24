-- Buyer membership tiers + Principals Club level (for the monthly figures report).
--
-- Both are lookup-driven (per the taxonomy rule — never hardcode display values).
-- The tiers reuse the old "deal structure" names (Partner / Affiliate /
-- Associate Plus / Associate) now that they describe a buyer's membership level.
-- Seeded here idempotently so applying the migration is self-contained; the same
-- values also live in seed.sql for fresh installs.

insert into public.lookup_types (key, label, is_system) values
  ('membership_tier', 'Membership tiers', false),
  ('principals_club_level', 'Principals Club levels', false)
on conflict (key) do nothing;

with t as (select id, key from public.lookup_types)
insert into public.lookup_values (lookup_type_id, value, sort_order, system_key)
select t.id, v.value, v.sort_order, v.system_key
from t
join (values
  ('membership_tier', 'Partner', 0, 'partner'),
  ('membership_tier', 'Affiliate', 1, 'affiliate'),
  ('membership_tier', 'Associate Plus', 2, 'associate_plus'),
  ('membership_tier', 'Associate', 3, 'associate'),
  ('principals_club_level', 'General', 0, 'general'),
  ('principals_club_level', 'Inner Circle', 1, 'inner_circle')
) as v(key, value, sort_order, system_key) on v.key = t.key
where not exists (
  select 1 from public.lookup_values lv where lv.lookup_type_id = t.id and lv.system_key = v.system_key
);

alter table public.contacts
  add column if not exists membership_tier_id uuid references public.lookup_values (id),
  add column if not exists principals_club_id uuid references public.lookup_values (id);

create index if not exists contacts_membership_tier_idx on public.contacts (membership_tier_id)
  where membership_tier_id is not null;
create index if not exists contacts_principals_club_idx on public.contacts (principals_club_id)
  where principals_club_id is not null;
