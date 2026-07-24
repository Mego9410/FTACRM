-- Profile extensions: notification preferences + richer staff profile fields
-- (used by My settings and Control Centre → Users).

alter table public.profiles add column if not exists notify_inapp boolean not null default true;
alter table public.profiles add column if not exists notify_email boolean not null default true;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists manager_id uuid references public.profiles (id) on delete set null;
