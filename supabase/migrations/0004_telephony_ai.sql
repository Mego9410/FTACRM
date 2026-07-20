-- FTA CRM — 0004: AI telephony (3CX call capture) + AI jobs/suggestions
-- Spec: docs/features/11-telephony.md

-- Staff extension mapping: resolves which agent was on a 3CX call.
alter table public.profiles add column if not exists threecx_extension text;
create unique index if not exists profiles_extension_idx
  on public.profiles (threecx_extension) where threecx_extension is not null;

-- ── Calls ────────────────────────────────────────────────────────────

create table public.call_recordings (
  id uuid primary key default gen_random_uuid(),
  provider_call_id text not null unique, -- 3CX call id (idempotency key)
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  practice_id uuid references public.practices (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  profile_id uuid references public.profiles (id), -- staff member on the call
  direction text not null check (direction in ('inbound', 'outbound')),
  external_number text,
  extension text,
  started_at timestamptz,
  duration_secs int,
  recording_available boolean not null default false,
  recording_path text, -- Storage path once fetched
  transcript text,     -- diarised ("Agent:" / "Caller:")
  transcript_status text not null default 'none' check (transcript_status in
    ('none', 'pending', 'transcribed', 'failed')),
  analysis_status text not null default 'none' check (analysis_status in
    ('none', 'pending', 'analysed', 'failed')),
  summary text,        -- AI summary written back to the journal too
  match_status text not null default 'unmatched' check (match_status in
    ('matched', 'ambiguous', 'unmatched', 'dismissed')),
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger call_recordings_updated before update on public.call_recordings
  for each row execute function public.set_updated_at();
create index call_recordings_status_idx
  on public.call_recordings (transcript_status, analysis_status);
create index call_recordings_unmatched_idx
  on public.call_recordings (created_at desc) where match_status = 'unmatched';
create index call_recordings_contact_idx on public.call_recordings (contact_id);

-- ── AI jobs (cost tracking + reproducibility for every model call) ───

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  model text,
  input_tokens int,
  output_tokens int,
  error text,
  requested_by uuid references public.profiles (id),
  call_recording_id uuid references public.call_recordings (id) on delete cascade,
  practice_id uuid references public.practices (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index ai_jobs_kind_idx on public.ai_jobs (kind, created_at desc);

-- ── AI suggestions (human-in-the-loop review queue) ──────────────────
-- Kinds: 'task' (proposed follow-up task), 'note' (proposed tidy note),
-- 'email_draft' (follow-up email), 'outreach' (best buyers when a practice
-- launches). Nothing acts until a user accepts.

create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('task', 'note', 'email_draft', 'outreach')),
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'dismissed', 'expired')),
  payload jsonb not null default '{}'::jsonb,
  call_recording_id uuid references public.call_recordings (id) on delete cascade,
  journal_entry_id uuid references public.journal_entries (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  practice_id uuid references public.practices (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  for_profile_id uuid references public.profiles (id), -- who should review/own it
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
create index ai_suggestions_pending_idx
  on public.ai_suggestions (for_profile_id, created_at desc) where status = 'proposed';
create index ai_suggestions_journal_idx on public.ai_suggestions (journal_entry_id);
create index ai_suggestions_practice_idx on public.ai_suggestions (practice_id);

-- ── RLS ──────────────────────────────────────────────────────────────

alter table public.call_recordings enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.ai_suggestions enable row level security;

create policy call_recordings_select on public.call_recordings
  for select to authenticated
  using (not is_private or profile_id = auth.uid());
create policy call_recordings_update on public.call_recordings
  for update to authenticated using (true) with check (true);

create policy ai_jobs_select on public.ai_jobs for select to authenticated using (true);

create policy ai_suggestions_select on public.ai_suggestions for select to authenticated using (true);
create policy ai_suggestions_update on public.ai_suggestions
  for update to authenticated using (true) with check (true);

-- Recording playback is permission-gated, a deliberate admin decision.
insert into public.role_permissions (role, permission) values
  ('admin', 'telephony.play_recordings')
on conflict (role, permission) do nothing;
