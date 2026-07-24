-- Holiday requests: staff request annual leave, management approve or decline.
--
-- A request is private to the requester and management until decided. On
-- approval an all-day calendar event is created (event type "Holiday", organiser
-- = the requester) so approved leave shows on the team diary; the request keeps
-- a reference to it so a later cancellation can remove it. A declined request
-- carries the manager's note explaining why.
--
-- Unlike the ordinary business tables (permissive RLS + server-action gating),
-- this table holds personal data, so RLS restricts reads to the owner and
-- management — mirroring the notifications / graph_connections precedent.

create table if not exists public.holiday_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decision_note text,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  calendar_event_id uuid references public.calendar_events (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint holiday_requests_dates_ck check (end_date >= start_date)
);

create index if not exists holiday_requests_profile_idx on public.holiday_requests (profile_id, start_date desc);
create index if not exists holiday_requests_status_idx on public.holiday_requests (status, start_date);

drop trigger if exists holiday_requests_updated on public.holiday_requests;
create trigger holiday_requests_updated before update on public.holiday_requests
  for each row execute function public.set_updated_at();

-- ── Row-level security ─────────────────────────────────────────────────
-- Reads: the requester, plus any admin/manager. Writes are additionally
-- constrained in the server actions (only management may decide; the owner may
-- only cancel their own pending request).
alter table public.holiday_requests enable row level security;

drop policy if exists holiday_requests_select on public.holiday_requests;
create policy holiday_requests_select on public.holiday_requests
  for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );

drop policy if exists holiday_requests_insert on public.holiday_requests;
create policy holiday_requests_insert on public.holiday_requests
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists holiday_requests_update on public.holiday_requests;
create policy holiday_requests_update on public.holiday_requests
  for update to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  )
  with check (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
  );
