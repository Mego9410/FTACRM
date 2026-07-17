-- FTA CRM — 0001: extensions, helpers, org structure, lookups
-- See docs/data-model.md for the design reference.

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists citext;

-- ── Helpers ──────────────────────────────────────────────────────────

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Great-circle distance in miles (replaces PostGIS for area matching).
create or replace function public.haversine_miles(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable parallel safe as $$
  select 3958.8 * 2 * asin(least(1.0, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2))
    * power(sin(radians(lng2 - lng1) / 2), 2)
  )))
$$;

-- ── Org structure ────────────────────────────────────────────────────

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address_line1 text,
  address_line2 text,
  town text,
  county text,
  postcode text,
  phone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger branches_updated before update on public.branches
  for each row execute function public.set_updated_at();

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email citext not null unique,
  role text not null default 'agent' check (role in ('admin', 'manager', 'agent')),
  branch_id uuid references public.branches (id),
  calendar_color text not null default '#B4862A',
  avatar_url text,
  is_active boolean not null default true,
  signature_html text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile row for each new auth user (invite flow).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('admin', 'manager', 'agent')),
  permission text not null,
  unique (role, permission)
);

-- ── Lookups (admin-editable taxonomy) ────────────────────────────────

create table public.lookup_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.lookup_values (
  id uuid primary key default gen_random_uuid(),
  lookup_type_id uuid not null references public.lookup_types (id) on delete cascade,
  value text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  color text,
  system_key text, -- stable machine key for values app logic must find (e.g. statuses)
  created_at timestamptz not null default now(),
  unique (lookup_type_id, value)
);
create index lookup_values_type_idx on public.lookup_values (lookup_type_id, sort_order);
create unique index lookup_values_system_key_idx
  on public.lookup_values (lookup_type_id, system_key) where system_key is not null;

-- ── Audit log (insert-only) ──────────────────────────────────────────

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  field text not null,
  old_value text,
  new_value text,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now()
);
create index audit_log_record_idx on public.audit_log (table_name, record_id, changed_at desc);
create index audit_log_user_idx on public.audit_log (changed_by, changed_at desc);

-- ── Reference number sequences ───────────────────────────────────────

create sequence public.contact_ref_seq;
create sequence public.practice_ref_seq;
create sequence public.deal_ref_seq;
