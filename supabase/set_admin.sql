-- Promote the account owner to admin.
-- New sign-ups default to the 'agent' role (see 0001_foundations.sql), which
-- cannot reach the manager-gated Reporting area or the Control Centre. Run this
-- once in the Supabase SQL editor to give the owner full access.

update public.profiles
set role = 'admin'
where email = 'oliver.acton@ft-associates.com';

-- Verify:
-- select full_name, email, role from public.profiles where role = 'admin';
