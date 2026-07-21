-- Record warnings ---------------------------------------------------------
-- A free-text alert that can be pinned to a contact (buyer/seller) or a
-- practice. Surfaced as a banner at the top of the record and pinned to the
-- top of its journal. Nullable — most records have none.

alter table public.contacts  add column if not exists warning text;
alter table public.practices add column if not exists warning text;
