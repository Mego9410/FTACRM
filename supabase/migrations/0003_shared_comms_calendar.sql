-- FTA CRM — 0003: journal, documents, checklists, tasks, notifications,
-- communications, calendar, saved views

-- ── Journal ──────────────────────────────────────────────────────────

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('call', 'note', 'email', 'sms', 'system', 'file')),
  subject text,
  body text,
  author_id uuid references public.profiles (id),
  contact_id uuid references public.contacts (id) on delete cascade,
  practice_id uuid references public.practices (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  call_outcome_id uuid references public.lookup_values (id),
  call_direction text check (call_direction in ('inbound', 'outbound')),
  email_message_id uuid,
  pinned boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contact_id is not null or practice_id is not null or deal_id is not null)
);
create trigger journal_entries_updated before update on public.journal_entries
  for each row execute function public.set_updated_at();
create index journal_contact_idx on public.journal_entries (contact_id, occurred_at desc);
create index journal_practice_idx on public.journal_entries (practice_id, occurred_at desc);
create index journal_deal_idx on public.journal_entries (deal_id, occurred_at desc);
create index journal_author_idx on public.journal_entries (author_id, occurred_at desc);
create index journal_feed_idx on public.journal_entries (occurred_at desc, id desc);

-- Human contact types bump last-contacted / deal activity.
create or replace function public.journal_touch() returns trigger
language plpgsql as $$
begin
  if new.entry_type in ('call', 'email', 'sms') and new.contact_id is not null then
    update public.contacts set last_contacted_at = greatest(coalesce(last_contacted_at, new.occurred_at), new.occurred_at)
    where id = new.contact_id;
  end if;
  if new.deal_id is not null and new.entry_type <> 'system' then
    update public.deals set last_activity_at = greatest(last_activity_at, new.occurred_at)
    where id = new.deal_id;
  end if;
  return new;
end $$;
create trigger journal_touch after insert on public.journal_entries
  for each row execute function public.journal_touch();

-- ── Documents ────────────────────────────────────────────────────────

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  category_id uuid references public.lookup_values (id),
  contact_id uuid references public.contacts (id) on delete cascade,
  practice_id uuid references public.practices (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index documents_contact_idx on public.documents (contact_id);
create index documents_practice_idx on public.documents (practice_id);
create index documents_deal_idx on public.documents (deal_id);

-- ── Checklists ───────────────────────────────────────────────────────

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  applies_to text not null check (applies_to in ('contact', 'practice', 'deal', 'valuation')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  is_required boolean not null default false
);

create table public.checklist_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.checklist_templates (id) on delete set null,
  name text not null,
  contact_id uuid references public.contacts (id) on delete cascade,
  practice_id uuid references public.practices (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  valuation_id uuid references public.valuations (id) on delete cascade,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index checklist_instances_contact_idx on public.checklist_instances (contact_id);
create index checklist_instances_practice_idx on public.checklist_instances (practice_id);
create index checklist_instances_deal_idx on public.checklist_instances (deal_id);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.checklist_instances (id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  checked boolean not null default false,
  checked_by uuid references public.profiles (id),
  checked_at timestamptz,
  due_date date
);
create index checklist_items_instance_idx on public.checklist_items (instance_id, sort_order);

-- ── Tasks & notifications ────────────────────────────────────────────

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  due_at timestamptz,
  assignee_id uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  category_id uuid references public.lookup_values (id),
  contact_id uuid references public.contacts (id) on delete cascade,
  practice_id uuid references public.practices (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();
create index tasks_assignee_idx on public.tasks (assignee_id, status, due_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_profile_idx on public.notifications (profile_id, created_at desc);

-- ── Communications ───────────────────────────────────────────────────

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope text not null default 'campaign' check (scope in ('campaign', 'one_to_one', 'system')),
  subject text not null,
  body_html text not null,
  record_context text not null default 'buyer' check (record_context in ('buyer', 'seller', 'practice', 'deal', 'contact')),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger email_templates_updated before update on public.email_templates
  for each row execute function public.set_updated_at();

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in
    ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  subject text,
  body_html text,
  segment_definition jsonb not null default '{}'::jsonb,
  from_profile_id uuid references public.profiles (id),
  practice_id uuid references public.practices (id) on delete set null,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  recipient_count int not null default 0,
  sent_count int not null default 0,
  delivered_count int not null default 0,
  open_count int not null default 0,
  click_count int not null default 0,
  bounce_count int not null default 0,
  unsubscribe_count int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger campaigns_updated before update on public.campaigns
  for each row execute function public.set_updated_at();
create index campaigns_status_idx on public.campaigns (status, created_at desc);

create table public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  email citext not null,
  status text not null default 'queued' check (status in
    ('queued', 'sent', 'delivered', 'bounced', 'suppressed', 'failed')),
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, contact_id)
);
create index campaign_recipients_campaign_idx on public.campaign_recipients (campaign_id, status);
create index campaign_recipients_provider_idx on public.campaign_recipients (provider_message_id);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  campaign_recipient_id uuid references public.campaign_recipients (id) on delete cascade,
  email_message_id uuid,
  event text not null check (event in
    ('delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
  occurred_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);
create index email_events_recipient_idx on public.email_events (campaign_recipient_id, event);

create table public.suppressions (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  reason text not null check (reason in
    ('unsubscribed', 'hard_bounce', 'complaint', 'manual', 'gdpr')),
  source_campaign_id uuid references public.campaigns (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.unsubscribe_tokens (
  token uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Microsoft 365 (structure only — linked when credentials configured) ──

create table public.graph_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  ms_user_id text,
  email citext,
  refresh_token_enc bytea,
  scopes text[] not null default '{}',
  mail_delta_token text,
  calendar_delta_token text,
  mail_subscription_id text,
  calendar_subscription_id text,
  subscription_expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'error', 'disconnected')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger graph_connections_updated before update on public.graph_connections
  for each row execute function public.set_updated_at();

create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  graph_message_id text,
  profile_id uuid references public.profiles (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  from_email citext,
  to_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  subject text,
  body_preview text,
  body_html text,
  sent_at timestamptz,
  matched boolean not null default false,
  is_private boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (profile_id, graph_message_id)
);

alter table public.journal_entries
  add constraint journal_email_message_fk
  foreign key (email_message_id) references public.email_messages (id) on delete set null;

alter table public.email_events
  add constraint email_events_message_fk
  foreign key (email_message_id) references public.email_messages (id) on delete cascade;

-- ── Calendar ─────────────────────────────────────────────────────────

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type_id uuid references public.lookup_values (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  body text,
  organiser_id uuid references public.profiles (id),
  practice_id uuid references public.practices (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  visibility text not null default 'normal' check (visibility in ('normal', 'private')),
  status text not null default 'confirmed' check (status in ('confirmed', 'tentative', 'cancelled')),
  graph_event_id text,
  ical_uid text,
  sync_state text not null default 'pending_push' check (sync_state in
    ('pending_push', 'synced', 'pull_only', 'error', 'local')),
  external_source text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger calendar_events_updated before update on public.calendar_events
  for each row execute function public.set_updated_at();
create index calendar_events_time_idx on public.calendar_events (starts_at, ends_at);
create index calendar_events_organiser_idx on public.calendar_events (organiser_id, starts_at);

alter table public.valuations
  add constraint valuations_event_fk
  foreign key (calendar_event_id) references public.calendar_events (id) on delete set null;
alter table public.viewings
  add constraint viewings_event_fk
  foreign key (calendar_event_id) references public.calendar_events (id) on delete set null;

create table public.calendar_event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  response text not null default 'none' check (response in ('none', 'accepted', 'declined', 'tentative')),
  check (profile_id is not null or contact_id is not null)
);
create index calendar_attendees_event_idx on public.calendar_event_attendees (event_id);
create index calendar_attendees_profile_idx on public.calendar_event_attendees (profile_id);

-- ── Saved views (smart lists) ────────────────────────────────────────

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  entity text not null check (entity in ('contacts', 'practices', 'deals', 'campaigns')),
  definition jsonb not null default '{}'::jsonb,
  owner_id uuid references public.profiles (id) on delete cascade, -- null = shared/system
  sort_order int not null default 0,
  show_on_dashboard boolean not null default false,
  cached_count int,
  cached_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Row-level security ───────────────────────────────────────────────
-- Baseline: FTA is one firm — authenticated staff read/write business data;
-- role-gated behaviour is enforced in server actions (docs/architecture.md).
-- Sensitive tables get tighter policies below.

do $$
declare t text;
begin
  foreach t in array array[
    'branches','profiles','role_permissions','lookup_types','lookup_values',
    'contacts','buyer_criteria','buyer_search_areas','contact_links',
    'practices','practice_contacts','valuations','viewings','offers',
    'practice_media','enquiries','deal_stages','deals','deal_stage_events',
    'match_exclusions','journal_entries','documents','checklist_templates',
    'checklist_template_items','checklist_instances','checklist_items',
    'tasks','notifications','email_templates','campaigns','campaign_recipients',
    'email_events','suppressions','unsubscribe_tokens','graph_connections',
    'email_messages','calendar_events','calendar_event_attendees','saved_views',
    'audit_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_select', t);
  end loop;

  -- Default write access for authenticated staff on ordinary business tables.
  foreach t in array array[
    'contacts','buyer_criteria','buyer_search_areas','contact_links',
    'practices','practice_contacts','valuations','viewings','offers',
    'practice_media','enquiries','deals','deal_stage_events','match_exclusions',
    'journal_entries','documents','checklist_instances','checklist_items',
    'tasks','email_templates','campaigns','campaign_recipients',
    'calendar_events','calendar_event_attendees','saved_views'
  ]
  loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (true)',
      t || '_delete', t);
  end loop;
end $$;

-- Tighten: graph connections are visible only to their owner (tokens live here).
drop policy graph_connections_select on public.graph_connections;
create policy graph_connections_owner on public.graph_connections
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Notifications: owner only.
drop policy notifications_select on public.notifications;
create policy notifications_owner on public.notifications
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Profiles: self-update only (admin writes go through service role).
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Audit log / admin config / suppressions / email_messages / events:
-- read-only for staff; writes via service role only (no insert policies).
