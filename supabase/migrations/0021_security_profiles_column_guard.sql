-- [SEV-CRITICAL-01] Prevent privilege self-escalation via the profiles table.
--
-- The profiles_self_update RLS policy scopes updates to the caller's own row
-- but not to specific columns, so any authenticated user could set their own
-- role to 'admin' directly via PostgREST. This trigger rejects changes to the
-- privileged columns (role, is_active, branch_id) unless the change comes from
-- the service role (admin actions use createAdminClient) or a direct database
-- connection (migrations / ops — no JWT present). Normal self-service updates
-- (full_name, calendar_color, signature_html) are unaffected.

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
     or new.is_active is distinct from old.is_active
     or new.branch_id is distinct from old.branch_id then
    raise exception 'Not authorised to change role, is_active or branch_id'
      using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before update on public.profiles
  for each row
  execute function public.guard_profiles_privileged_columns();
