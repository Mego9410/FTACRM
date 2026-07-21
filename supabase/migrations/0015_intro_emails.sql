-- Introduction emails ---------------------------------------------------------
-- A one-to-one, natural-language follow-up email an agent sends to a single
-- buyer after a phone call — a top paragraph, a tick-list of reusable
-- "introduction" blocks (FTA Finance, CQC contact, solicitors, etc.), and a
-- tail paragraph. Deliberately separate from the campaigns/launches pipeline:
-- plain text, no marketing shell, no unsubscribe footer, sent one at a time
-- from the contact's own record, not as part of account setup.

create table if not exists public.intro_email_blocks (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  body text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace trigger intro_email_blocks_updated before update on public.intro_email_blocks
  for each row execute function public.set_updated_at();

create table if not exists public.intro_emails (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  subject text not null,
  body_text text not null,
  block_labels text[] not null default '{}',
  sent_by uuid references public.profiles (id),
  sent_at timestamptz not null default now()
);
create index if not exists intro_emails_contact_idx on public.intro_emails (contact_id, sent_at desc);

alter table public.intro_email_blocks enable row level security;
alter table public.intro_emails enable row level security;

do $$
begin
  -- Blocks: every signed-in user can read the library; only Control Centre
  -- (admin, via the service-role client) can add/edit/remove them.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'intro_email_blocks' and policyname = 'intro_email_blocks_select') then
    create policy intro_email_blocks_select on public.intro_email_blocks for select to authenticated using (true);
  end if;

  -- Sent-email log: ordinary staff read/write, same shape as journal_entries.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'intro_emails' and policyname = 'intro_emails_select') then
    create policy intro_emails_select on public.intro_emails for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'intro_emails' and policyname = 'intro_emails_insert') then
    create policy intro_emails_insert on public.intro_emails for insert to authenticated with check (true);
  end if;
end $$;

-- Starter set of blocks so the tick-list isn't empty on first use.
insert into public.intro_email_blocks (label, body, sort_order)
select v.label, v.body, v.sort_order
from (values
  ('FTA Finance', 'I''d also like to introduce you to our finance team at FTA Finance, who specialise in acquisition funding for dental practices and can talk you through the options available to you.', 0),
  ('CQC registration contact', 'When you''re ready, I can put you in touch with our CQC registration contact, who guides buyers through the registration process so there''s no delay to completion.', 1),
  ('Recommended solicitors', 'If you don''t already have a solicitor lined up, we work closely with a small panel of solicitors experienced in dental practice transactions and would be happy to make an introduction.', 2)
) as v(label, body, sort_order)
where not exists (select 1 from public.intro_email_blocks b where b.label = v.label);
