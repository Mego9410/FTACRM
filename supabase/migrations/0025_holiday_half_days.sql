-- Half-day holiday support.
--
-- A request can now cover part of a day. Each boundary of the range carries a
-- "portion": full, am (morning only) or pm (afternoon only). For a single-day
-- request the two portions are kept equal. Typical uses:
--   * one morning/afternoon off  → start=end, both 'am' or both 'pm'
--   * leave at lunch on day one   → start_portion 'pm'
--   * back at lunch on the last day → end_portion 'am'
-- Existing rows default to whole days, so this is backwards-compatible.

alter table public.holiday_requests
  add column if not exists start_portion text not null default 'full'
    check (start_portion in ('full', 'am', 'pm')),
  add column if not exists end_portion text not null default 'full'
    check (end_portion in ('full', 'am', 'pm'));
