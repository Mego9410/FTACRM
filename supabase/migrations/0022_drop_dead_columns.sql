-- Data-model single-source-of-truth cleanup — drop dead columns and tables.
--
-- Removes fields left behind by features that were cut from the product, so a
-- fact can no longer be written to a place the UI never shows. See
-- DATA-MODEL-REVIEW.md (section D) for the full rationale. Each of these is
-- confirmed gone for good:
--   * owner_id (contacts, practices, deals) — no "record owner" concept.
--   * branch_id (contacts, practices, profiles) + the branches table — single
--     office, no branches.
--   * deal_structure_ids (practices, buyer_criteria) + the deal_structure
--     lookup — the deal-structure selector was removed.
--   * confidential (practices) — the toggle was removed; the public page now
--     hard-hides identifying details regardless.
--   * buyer_solicitor_id / seller_solicitor_id (deals) — solicitors are a
--     single home on practice_contacts (roles buyer_solicitor/seller_solicitor);
--     the deal's People tab now reads them from there.
--
-- Idempotent: uses IF EXISTS throughout so it is safe to re-run.

-- 1. Recreate the profiles privilege guard WITHOUT branch_id before the column
--    goes away (the trigger function references it). The guard now protects
--    role and is_active only. See migration 0021 for the original rationale.
create or replace function public.guard_profiles_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_claims text := current_setting('request.jwt.claims', true);
begin
  -- No JWT (direct DB connection: migrations, seed, set_admin.sql) or the
  -- service role (server-side admin actions) may change privileged columns.
  if jwt_claims is null
     or (jwt_claims::json ->> 'role') = 'service_role' then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active then
    raise exception 'Not authorised to change role or is_active'
      using errcode = '42501';
  end if;

  return new;
end $$;

-- 2. Drop the dead columns. Dropping a column also drops its indexes and FK
--    constraints, so the explicit index drops below are belt-and-braces.
drop index if exists public.contacts_owner_idx;
drop index if exists public.practices_owner_idx;
drop index if exists public.deals_owner_idx;

alter table public.contacts      drop column if exists owner_id;
alter table public.contacts      drop column if exists branch_id;

alter table public.practices     drop column if exists owner_id;
alter table public.practices     drop column if exists branch_id;
alter table public.practices     drop column if exists confidential;
alter table public.practices     drop column if exists deal_structure_ids;

alter table public.deals         drop column if exists owner_id;
alter table public.deals         drop column if exists branch_id;
alter table public.deals         drop column if exists buyer_solicitor_id;
alter table public.deals         drop column if exists seller_solicitor_id;

alter table public.buyer_criteria drop column if exists deal_structure_ids;

alter table public.profiles      drop column if exists branch_id;

-- 3. The branches table is now unreferenced.
drop trigger if exists branches_updated on public.branches;
drop table if exists public.branches;

-- 4. Remove the deal_structure lookup type and its values.
delete from public.lookup_values lv
  using public.lookup_types lt
  where lv.lookup_type_id = lt.id and lt.key = 'deal_structure';
delete from public.lookup_types where key = 'deal_structure';
