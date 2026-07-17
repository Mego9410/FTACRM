-- LOCAL DEV ONLY — applied automatically after seed.sql on `supabase db reset` / first
-- `supabase start` (wired via [db.seed].sql_paths in supabase/config.toml).
--
-- A fresh local Supabase stack sets the public-schema default privileges so that
-- anon/authenticated/service_role only receive TRUNCATE/REFERENCES/TRIGGER/MAINTAIN on
-- new tables — NOT SELECT/INSERT/UPDATE/DELETE. The app's numbered migrations rely on
-- Supabase's usual full default grants (present on the hosted project) and therefore do
-- not GRANT explicitly. Without this file, every authenticated table read fails with
-- "permission denied for table ..." (42501) and sign-in bounces back to /sign-in because
-- the app cannot load the signed-in user's profile.
--
-- This grants the standard Supabase privileges to match hosted behaviour. It only ever
-- runs against the local stack (seed files are not applied by `supabase db push`).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
