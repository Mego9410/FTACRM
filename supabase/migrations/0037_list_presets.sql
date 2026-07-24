-- Saved views: a user's named filter presets for a list (contacts, practices,
-- deals). Stores the URL query string that reproduces the filtered list.

create table if not exists public.list_presets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  entity text not null check (entity in ('contacts', 'practices', 'deals')),
  name text not null,
  query text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists list_presets_owner_idx on public.list_presets (profile_id, entity);

alter table public.list_presets enable row level security;
-- Owner-scoped: each user manages their own views.
drop policy if exists list_presets_own on public.list_presets;
create policy list_presets_own on public.list_presets for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
