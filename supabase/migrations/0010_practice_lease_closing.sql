-- 0010: dental-relevant fields carried over from the legacy practice record.
-- lease_expiry  — when the practice lease runs out (Information → Tenure in legacy).
-- closing_date  — best-and-final offers deadline (legacy NOI tab).

alter table public.practices add column if not exists lease_expiry date;
alter table public.practices add column if not exists closing_date date;
