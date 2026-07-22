-- Public landing page per practice: unguessable share token + enquiry capture.

-- Token the public URL is built from (/p/<token>). UUID so it can't be enumerated.
alter table public.practices
  add column if not exists public_token uuid not null unique default gen_random_uuid();

-- Enquiries submitted through the public "request more information" form.
create table if not exists public.practice_enquiries (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  name text not null,
  job_title text,
  company text,
  email text not null,
  phone text,
  consent_contact boolean not null default false,
  remove_from_list boolean not null default false,
  only_sale_details boolean not null default false,
  status text not null default 'new' check (status in ('new', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists practice_enquiries_practice_idx
  on public.practice_enquiries (practice_id, created_at desc);
create index if not exists practice_enquiries_status_idx
  on public.practice_enquiries (status);

alter table public.practice_enquiries enable row level security;

-- Staff read/manage; public inserts happen server-side via the service role.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'practice_enquiries'
      and policyname = 'practice_enquiries_select_authenticated'
  ) then
    create policy practice_enquiries_select_authenticated
      on public.practice_enquiries for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'practice_enquiries'
      and policyname = 'practice_enquiries_update_authenticated'
  ) then
    create policy practice_enquiries_update_authenticated
      on public.practice_enquiries for update to authenticated using (true) with check (true);
  end if;
end $$;
