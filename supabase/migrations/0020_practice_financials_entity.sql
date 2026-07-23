-- Extra practice facts surfaced in launches / the public page:
-- reconstituted profit, year established, and trading entity (Ltd co etc.).

alter table public.practices add column if not exists reconstituted_profit numeric(12, 2);
alter table public.practices add column if not exists established_year int;
alter table public.practices add column if not exists trading_entity_id uuid references public.lookup_values (id);

-- Trading entity taxonomy (read via the lookups system, admin-editable).
insert into public.lookup_types (key, label, is_system)
values ('trading_entity', 'Trading entities', true)
on conflict (key) do nothing;

insert into public.lookup_values (lookup_type_id, value, sort_order, color, system_key)
select t.id, v.value, v.sort_order, null, v.system_key
from public.lookup_types t
join (values
  ('Limited Company', 0, 'limited_company'),
  ('Sole Trader', 1, 'sole_trader'),
  ('Partnership', 2, 'partnership'),
  ('Expense Sharing', 3, 'expense_sharing')
) as v(value, sort_order, system_key) on true
where t.key = 'trading_entity'
on conflict (lookup_type_id, value) do nothing;

-- Backfill existing (demo) practices so the new fields aren't blank. Guarded on
-- NULL so it never overwrites real data entered later, and deterministic so the
-- migration is idempotent.
update public.practices
set reconstituted_profit = round(coalesce(ebitda, annual_turnover * 0.28))
where reconstituted_profit is null and coalesce(ebitda, annual_turnover) is not null;

update public.practices
set established_year = 1900 + (abs(hashtext(id::text)) % 116)   -- 1900–2015, stable per row
where established_year is null;

update public.practices
set trading_entity_id = (
  select lv.id from public.lookup_values lv
  join public.lookup_types lt on lt.id = lv.lookup_type_id
  where lt.key = 'trading_entity' and lv.system_key = 'limited_company'
)
where trading_entity_id is null;
