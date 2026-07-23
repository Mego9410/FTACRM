-- Onboarding: force a password change on first sign-in.
--
-- Admins create accounts with a shared/temporary password (see the Users admin).
-- New accounts are flagged must_change_password = true; the app gate redirects
-- them to /change-password until they set their own. The change-password action
-- clears the flag (via the service role) as it sets the new password.
--
-- must_change_password joins role and is_active as a privileged column: a user
-- must not be able to clear it themselves without actually changing the password,
-- so the guard blocks self-service updates to it. Idempotent.

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- Extend the privilege guard (migration 0021) to cover must_change_password.
create or replace function public.guard_profiles_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_claims text := current_setting('request.jwt.claims', true);
begin
  -- No JWT (direct DB connection: migrations, seed, set_admin.sql — the claim is
  -- unset/empty) or the service role (server-side admin actions) may change
  -- privileged columns.
  if jwt_claims is null
     or jwt_claims = ''
     or (jwt_claims::json ->> 'role') = 'service_role' then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.must_change_password is distinct from old.must_change_password then
    raise exception 'Not authorised to change role, is_active or must_change_password'
      using errcode = '42501';
  end if;

  return new;
end $$;
