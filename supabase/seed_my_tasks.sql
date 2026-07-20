-- ============================================================================
-- Add a personal set of demo tasks (and a couple of diary events) to ONE
-- user's account — e.g. yours — so My Day and the Tasks page have something
-- to show for your login specifically.
--
-- HOW TO USE: set the email on the line marked below to your sign-in email,
-- paste the whole file into the Supabase SQL editor, and Run.
--
-- Safe to re-run: it replaces only the rows it created (tagged in `details` /
-- event title), and never touches anything else.
-- ============================================================================

do $$
declare
  target_email text := 'oliver.acton@ft-associates.com';  -- ← set to your email
  v_me   uuid;
  marker text := '[Added by seed_my_tasks]';
  ev_type_meeting uuid;
  ev_type_viewing uuid;
  c_id uuid; c_name text; p_id uuid; p_title text; ev_id uuid;
  j int;
  due_days  int[]  := array[-3, -1, 0, 2, 5];   -- overdue, overdue, today, upcoming, upcoming
  done_idx  int    := 4;                          -- which one is already completed
  titles text[] := array[
    'Call back seller re valuation',
    'Chase outstanding NDA from buyer',
    'Send comparable evidence pack',
    'Confirm viewing feedback',
    'Review new buyer registrations'];
begin
  select id into v_me from public.profiles
   where lower(email) = lower(target_email) and is_active
   order by created_at limit 1;
  if v_me is null then
    raise exception 'No active profile found for %. Set target_email to your sign-in address.', target_email;
  end if;

  select lv.id into ev_type_meeting from public.lookup_values lv
    join public.lookup_types lt on lt.id = lv.lookup_type_id
    where lt.key = 'event_type' and lv.system_key = 'meeting';
  select lv.id into ev_type_viewing from public.lookup_values lv
    join public.lookup_types lt on lt.id = lv.lookup_type_id
    where lt.key = 'event_type' and lv.system_key = 'viewing';

  -- Clean up a previous run of this snippet (only its own rows).
  delete from public.tasks where assignee_id = v_me and details = marker;
  delete from public.calendar_events where organiser_id = v_me and title like '%' || marker;

  -- ── 5 tasks: 2 overdue, 1 due today, upcoming, 1 done ──────────────────
  for j in 1..5 loop
    select id, coalesce(nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), company_name)
      into c_id, c_name
    from public.contacts where archived_at is null
    order by md5('mytask' || j::text || id::text) limit 1;

    insert into public.tasks (title, details, due_at, assignee_id, created_by, status, contact_id, completed_at, created_at)
    values (
      titles[j] || case when c_name is not null then ' — ' || c_name else '' end,
      marker,
      date_trunc('day', now()) + (due_days[j] || ' days')::interval + interval '16 hours',
      v_me, v_me,
      case when j = done_idx then 'done' else 'open' end,
      c_id,
      case when j = done_idx then now() - interval '6 hours' else null end,
      now() - interval '2 days');
  end loop;

  -- ── 2 events today so My Day isn't empty ───────────────────────────────
  select id, display_title into p_id, p_title from public.practices
   where archived_at is null order by md5('myev' || v_me::text) limit 1;

  insert into public.calendar_events (title, event_type_id, starts_at, ends_at, organiser_id, practice_id, status, sync_state, created_by)
  values (coalesce('Viewing — ' || p_title, 'Buyer viewing') || ' ' || marker,
          ev_type_viewing, date_trunc('day', now()) + interval '10 hours',
          date_trunc('day', now()) + interval '11 hours', v_me, p_id, 'confirmed', 'local', v_me)
  returning id into ev_id;
  insert into public.calendar_event_attendees (event_id, profile_id) values (ev_id, v_me);

  insert into public.calendar_events (title, event_type_id, starts_at, ends_at, organiser_id, status, sync_state, created_by)
  values ('Pipeline review ' || marker, ev_type_meeting,
          date_trunc('day', now()) + interval '15 hours',
          date_trunc('day', now()) + interval '15 hours 45 minutes', v_me, 'confirmed', 'local', v_me)
  returning id into ev_id;
  insert into public.calendar_event_attendees (event_id, profile_id) values (ev_id, v_me);

  raise notice 'Added 5 tasks (2 overdue, 1 today, upcoming, 1 done) and 2 events today for %', target_email;
end $$;
