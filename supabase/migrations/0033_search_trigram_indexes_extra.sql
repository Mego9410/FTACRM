-- Global search speed-up (part 2): the remaining ILIKE search columns not
-- covered by 0032. Same rationale — gin_trgm_ops makes `column ILIKE '%term%'`
-- index-backed instead of a sequential scan.
--
--   * practices.county   — searched by the Sales progression / Deals search
--                          (src/app/(app)/deals/page.tsx).
--   * contacts.work_phone — searched by inbound-call contact matching
--                          (src/lib/telephony/match.ts), alongside phone/mobile
--                          which were already indexed in 0032.

create extension if not exists pg_trgm;

create index if not exists practices_county_trgm    on public.practices using gin (county gin_trgm_ops);
create index if not exists contacts_work_phone_trgm  on public.contacts using gin (work_phone gin_trgm_ops);
