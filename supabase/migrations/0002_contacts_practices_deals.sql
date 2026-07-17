-- FTA CRM — 0002: contacts, practices, deals and their satellite tables

-- ── Contacts ─────────────────────────────────────────────────────────

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default 'C-' || lpad(nextval('public.contact_ref_seq')::text, 6, '0'),
  kind text not null default 'person' check (kind in ('person', 'organisation')),
  title text,
  first_name text,
  last_name text,
  company_name text,
  salutation text,
  email citext,
  email_secondary citext,
  phone text,
  mobile text,
  work_phone text,
  website text,
  address_line1 text,
  address_line2 text,
  town text,
  county text,
  postcode text,
  country text default 'United Kingdom',
  lat double precision,
  lng double precision,
  roles text[] not null default '{}',
  status text,
  source_id uuid references public.lookup_values (id),
  owner_id uuid references public.profiles (id),
  branch_id uuid references public.branches (id),
  temperature text check (temperature in ('hot', 'warm', 'cold')),
  notes text,
  organisation_id uuid references public.contacts (id),
  consent_email boolean,
  consent_sms boolean,
  consent_phone boolean,
  consent_letter boolean,
  consent_updated_at timestamptz,
  do_not_contact boolean not null default false,
  identity_verified boolean not null default false,
  identity_verified_at timestamptz,
  address_verified boolean not null default false,
  last_contacted_at timestamptz,
  legacy_ref text,
  archived_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger contacts_updated before update on public.contacts
  for each row execute function public.set_updated_at();

create index contacts_email_idx on public.contacts (email);
create index contacts_owner_idx on public.contacts (owner_id);
create index contacts_roles_idx on public.contacts using gin (roles);
create index contacts_postcode_idx on public.contacts (postcode);
create index contacts_last_contacted_idx on public.contacts (last_contacted_at);
create index contacts_search_idx on public.contacts using gin (
  (coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(company_name, '')) gin_trgm_ops
);

create table public.buyer_criteria (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null unique references public.contacts (id) on delete cascade,
  min_price numeric(12, 2),
  max_price numeric(12, 2),
  specialism_ids uuid[] not null default '{}',
  deal_structure_ids uuid[] not null default '{}',
  funding_type_ids uuid[] not null default '{}',
  tenure_type_ids uuid[] not null default '{}',
  buyer_position_id uuid references public.lookup_values (id),
  timescale text check (timescale in ('asap', '3m', '6m', '12m+')),
  finance_status text check (finance_status in ('cash', 'mortgage_agreed', 'mortgage_needed', 'unknown')),
  min_surgeries int,
  min_annual_turnover numeric(12, 2),
  notes text,
  updated_at timestamptz not null default now()
);
create trigger buyer_criteria_updated before update on public.buyer_criteria
  for each row execute function public.set_updated_at();

create table public.buyer_search_areas (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  label text not null,
  lat double precision,
  lng double precision,
  radius_miles numeric(6, 2),
  region text, -- named UK region alternative to point+radius
  created_at timestamptz not null default now()
);
create index buyer_search_areas_contact_idx on public.buyer_search_areas (contact_id);

create table public.contact_links (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  related_contact_id uuid not null references public.contacts (id) on delete cascade,
  relationship text not null,
  created_at timestamptz not null default now(),
  unique (contact_id, related_contact_id, relationship)
);

-- ── Practices ────────────────────────────────────────────────────────

create table public.practices (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default 'P-' || to_char(now(), 'YYYY') || '-'
    || lpad(nextval('public.practice_ref_seq')::text, 4, '0'),
  name text,
  display_title text not null,
  address_line1 text,
  address_line2 text,
  town text,
  county text,
  postcode text,
  lat double precision,
  lng double precision,
  status text not null default 'valuation' check (status in
    ('valuation', 'preparing', 'available', 'under_offer', 'sold_stc', 'completed', 'withdrawn')),
  asking_price numeric(12, 2),
  price_prefix text default 'guide' check (price_prefix in ('guide', 'offers_over', 'fixed', 'poa')),
  funding_type_id uuid references public.lookup_values (id),
  tenure_type_id uuid references public.lookup_values (id),
  deal_structure_ids uuid[] not null default '{}',
  specialism_ids uuid[] not null default '{}',
  surgeries int,
  annual_turnover numeric(12, 2),
  ebitda numeric(12, 2),
  nhs_contract_value numeric(12, 2),
  udas int,
  staff_count int,
  description text,
  confidential boolean not null default true,
  owner_id uuid references public.profiles (id),
  branch_id uuid references public.branches (id),
  instructed_at date,
  contract_expiry date,
  fee_percent numeric(5, 2),
  fee_fixed numeric(12, 2),
  withdrawn_at date,
  withdrawal_reason_id uuid references public.lookup_values (id),
  legacy_ref text,
  archived_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger practices_updated before update on public.practices
  for each row execute function public.set_updated_at();

create index practices_status_idx on public.practices (status);
create index practices_owner_idx on public.practices (owner_id);
create index practices_search_idx on public.practices using gin (
  (coalesce(display_title, '') || ' ' || coalesce(name, '') || ' ' || coalesce(town, '')
   || ' ' || coalesce(postcode, '') || ' ' || ref) gin_trgm_ops
);

create table public.practice_contacts (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  role text not null check (role in
    ('seller', 'buyer', 'seller_solicitor', 'buyer_solicitor', 'accountant', 'other')),
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (practice_id, contact_id, role)
);
create index practice_contacts_practice_idx on public.practice_contacts (practice_id);
create index practice_contacts_contact_idx on public.practice_contacts (contact_id);

create table public.valuations (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  valuer_ids uuid[] not null default '{}',
  appointment_at timestamptz,
  duration_mins int default 60,
  booked boolean not null default false,
  confirmed boolean not null default false,
  price_from numeric(12, 2),
  price_to numeric(12, 2),
  seller_expectation numeric(12, 2),
  suggested_price numeric(12, 2),
  fee_percent numeric(5, 2),
  fee_fixed numeric(12, 2),
  outcome text check (outcome in ('pending', 'instructed', 'declined')),
  notes text,
  calendar_event_id uuid,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger valuations_updated before update on public.valuations
  for each row execute function public.set_updated_at();
create index valuations_practice_idx on public.valuations (practice_id);

create table public.viewings (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  buyer_contact_id uuid not null references public.contacts (id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_mins int default 60,
  status text not null default 'requested' check (status in
    ('requested', 'confirmed', 'completed', 'cancelled', 'no_show')),
  accompanied_by uuid references public.profiles (id),
  feedback text,
  feedback_requested_at timestamptz,
  calendar_event_id uuid,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger viewings_updated before update on public.viewings
  for each row execute function public.set_updated_at();
create index viewings_practice_idx on public.viewings (practice_id);
create index viewings_buyer_idx on public.viewings (buyer_contact_id);
create index viewings_time_idx on public.viewings (scheduled_at);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  buyer_contact_id uuid not null references public.contacts (id) on delete cascade,
  amount numeric(12, 2) not null,
  status text not null default 'pending' check (status in
    ('pending', 'accepted', 'declined', 'withdrawn', 'fallen_through')),
  offer_date date not null default current_date,
  conditions text,
  finance_status text check (finance_status in ('cash', 'mortgage_agreed', 'mortgage_needed', 'unknown')),
  accepted_at timestamptz,
  declined_reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger offers_updated before update on public.offers
  for each row execute function public.set_updated_at();
create index offers_practice_idx on public.offers (practice_id);
create index offers_buyer_idx on public.offers (buyer_contact_id);

create table public.practice_media (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  storage_path text not null,
  kind text not null default 'photo' check (kind in ('photo', 'floorplan', 'video', 'doc')),
  caption text,
  sort_order int not null default 0,
  is_confidential boolean not null default false,
  created_at timestamptz not null default now()
);
create index practice_media_practice_idx on public.practice_media (practice_id, sort_order);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid references public.practices (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  source text,
  name text,
  email text,
  phone text,
  message text,
  received_at timestamptz not null default now(),
  handled_by uuid references public.profiles (id),
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);
create index enquiries_status_idx on public.enquiries (status, received_at desc);

-- ── Deals (sales progression) ────────────────────────────────────────

create table public.deal_stages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order int not null,
  is_terminal boolean not null default false
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default 'D-' || to_char(now(), 'YYYY') || '-'
    || lpad(nextval('public.deal_ref_seq')::text, 4, '0'),
  practice_id uuid not null references public.practices (id) on delete cascade,
  offer_id uuid references public.offers (id),
  buyer_contact_id uuid references public.contacts (id),
  seller_contact_id uuid references public.contacts (id),
  buyer_solicitor_id uuid references public.contacts (id),
  seller_solicitor_id uuid references public.contacts (id),
  agreed_price numeric(12, 2),
  status text not null default 'in_progress' check (status in
    ('in_progress', 'completed', 'fallen_through', 'on_hold')),
  current_stage_id uuid references public.deal_stages (id),
  target_completion_date date,
  owner_id uuid references public.profiles (id),
  fall_through_reason_id uuid references public.lookup_values (id),
  fell_through_at date,
  completed_at date,
  last_activity_at timestamptz not null default now(),
  legacy_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger deals_updated before update on public.deals
  for each row execute function public.set_updated_at();
create index deals_status_idx on public.deals (status, last_activity_at);
create index deals_owner_idx on public.deals (owner_id);
create index deals_practice_idx on public.deals (practice_id);

create table public.deal_stage_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  stage_id uuid not null references public.deal_stages (id),
  achieved_on date not null default current_date,
  recorded_by uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now(),
  unique (deal_id, stage_id)
);
create index deal_stage_events_deal_idx on public.deal_stage_events (deal_id);

create table public.match_exclusions (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (practice_id, contact_id)
);
