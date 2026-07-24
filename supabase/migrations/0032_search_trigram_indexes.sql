-- Global search speed-up: trigram (pg_trgm) GIN indexes.
--
-- The global search (src/app/(app)/search-action.ts) and the list-page
-- filters match with `column ILIKE '%term%'`. A leading wildcard can't use a
-- normal b-tree index, so Postgres sequential-scans every row. A GIN index
-- with gin_trgm_ops makes those ILIKE matches index-backed, keeping search
-- fast as the tables grow past a few thousand rows. No query change is needed
-- — the planner uses these automatically for ILIKE.

create extension if not exists pg_trgm;

-- Contacts — name / company / email / phone / mobile / ref are all searched.
create index if not exists contacts_first_name_trgm  on public.contacts using gin (first_name gin_trgm_ops);
create index if not exists contacts_last_name_trgm   on public.contacts using gin (last_name gin_trgm_ops);
create index if not exists contacts_company_name_trgm on public.contacts using gin (company_name gin_trgm_ops);
create index if not exists contacts_email_trgm       on public.contacts using gin (email gin_trgm_ops);
create index if not exists contacts_phone_trgm       on public.contacts using gin (phone gin_trgm_ops);
create index if not exists contacts_mobile_trgm      on public.contacts using gin (mobile gin_trgm_ops);
create index if not exists contacts_ref_trgm         on public.contacts using gin (ref gin_trgm_ops);

-- Practices — title / trading name / town / postcode / ref.
create index if not exists practices_display_title_trgm on public.practices using gin (display_title gin_trgm_ops);
create index if not exists practices_name_trgm          on public.practices using gin (name gin_trgm_ops);
create index if not exists practices_town_trgm          on public.practices using gin (town gin_trgm_ops);
create index if not exists practices_postcode_trgm      on public.practices using gin (postcode gin_trgm_ops);
create index if not exists practices_ref_trgm           on public.practices using gin (ref gin_trgm_ops);

-- Deals — searched by reference.
create index if not exists deals_ref_trgm on public.deals using gin (ref gin_trgm_ops);
