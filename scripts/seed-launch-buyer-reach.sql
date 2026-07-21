-- Launch testing top-up — widen buyer reach so every practice resolves to a
-- healthy launch audience. Data-only and idempotent; safe to re-run.
--
-- What it does:
--   1. Backfills coordinates on any practice missing lat/lng (from its town's
--      demo coordinates, else central England) so radius matching can reach it.
--   2. Ensures every active buyer has a buyer_criteria row (open criteria).
--   3. Gives every active buyer two extra WIDE search areas (150-mile radius),
--      centred round-robin on real practice locations — labelled "(wide reach)"
--      so re-runs don't duplicate them. Existing tight areas are kept.
--   4. Opens up every second buyer into an "any price / any type" investor so
--      price bands and funding/specialism constraints can't starve a launch.
--   5. Confirms email consent on active buyers so they pass launch eligibility.

begin;

-- 1 ── practices without coordinates get their town's coords (or a fallback)
with town_coords as (
  select distinct on (lower(town)) lower(town) as town, lat, lng
  from public.practices
  where town is not null and lat is not null and lng is not null
)
update public.practices p
set lat = coalesce((select tc.lat from town_coords tc where tc.town = lower(p.town)), 52.48)
          + (random() - 0.5) * 0.05,
    lng = coalesce((select tc.lng from town_coords tc where tc.town = lower(p.town)), -1.9)
          + (random() - 0.5) * 0.05
where p.lat is null or p.lng is null;

-- 2 ── every active buyer gets a criteria row (open by default)
insert into public.buyer_criteria (contact_id)
select c.id
from public.contacts c
where 'buyer' = any(c.roles)
  and c.archived_at is null
  and not exists (select 1 from public.buyer_criteria bc where bc.contact_id = c.id);

-- 3 ── two wide search areas per buyer, centred on real practices round-robin
with buyers as (
  select c.id, row_number() over (order by c.id) - 1 as rn
  from public.contacts c
  where 'buyer' = any(c.roles)
    and c.archived_at is null
    and not exists (
      select 1 from public.buyer_search_areas a
      where a.contact_id = c.id and a.label like '%(wide reach)'
    )
),
practices as (
  select id, town, county, lat, lng,
         row_number() over (order by id) - 1 as pn,
         count(*) over () as pcount
  from public.practices
  where lat is not null and lng is not null
)
insert into public.buyer_search_areas (contact_id, label, lat, lng, radius_miles)
select b.id,
       coalesce(p.town, p.county, 'Central UK') || ' (wide reach)',
       p.lat, p.lng, 150
from buyers b
join practices p
  on p.pn in (b.rn % p.pcount, (b.rn + p.pcount / 2) % p.pcount)
where (select count(*) from practices) > 0;

-- 4 ── every second buyer becomes an open investor (any price, any type)
with ranked as (
  select bc.id, row_number() over (order by bc.contact_id) as rn
  from public.buyer_criteria bc
  join public.contacts c on c.id = bc.contact_id
  where 'buyer' = any(c.roles) and c.archived_at is null
)
update public.buyer_criteria bc
set min_price = null,
    max_price = null,
    funding_type_ids = '{}',
    tenure_type_ids = '{}',
    specialism_ids = '{}',
    deal_structure_ids = '{}',
    min_surgeries = null,
    min_annual_turnover = null
from ranked r
where bc.id = r.id and r.rn % 2 = 0;

-- 5 ── active buyers pass launch consent checks
update public.contacts
set consent_email = true,
    consent_updated_at = coalesce(consent_updated_at, now())
where 'buyer' = any(roles)
  and archived_at is null
  and do_not_contact = false
  and consent_email is distinct from true;

commit;
