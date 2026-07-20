-- FTA CRM — 0005: per-user customisable dashboard layout
-- Stores each user's My Day widget arrangement (enabled widgets + grid
-- positions/sizes per breakpoint). Null = the default layout.

alter table public.profiles add column if not exists dashboard_layout jsonb;
