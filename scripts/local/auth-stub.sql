-- LOCAL VALIDATION ONLY — never run against Supabase.
-- Minimal stand-in for the platform-provided auth schema so migrations apply
-- on a vanilla Postgres.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$ select null::uuid $$;

create or replace function auth.role() returns text
language sql stable as $$ select 'authenticated'::text $$;

do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end $$;
