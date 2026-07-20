-- ============================================================================
-- FTA CRM — DEMO DATA (full-flow edition)
--
-- Loads a complete, connected dataset so every part of the CRM shows real
-- flow:
--   · 10 demo staff (selectable everywhere: owners, calendar, tasks, calls)
--   · 100 buyers + 100 sellers with criteria/areas, owned round-robin
--   · 50 practices across the lifecycle, linked sellers + interested buyers
--   · offers + deals across the 7 progression stages
--   · ~470 pieces of correspondence between agents, contacts and practices
--   · 10 AI-captured calls: diarised transcripts, AI summaries on the
--     buyer/seller journals, pending task/email suggestions to review
--   · tasks already created from AI calls, assigned across the team
--   · ~2 weeks of team calendar events (valuations, viewings, meetings)
--   · a launch-outreach flag (best buyers) on a live practice
--
-- Idempotent: demo rows are tagged (DEMO-… legacy_ref / provider ids) or owned
-- by the fixed demo staff, and are replaced on re-run. Real records are never
-- touched. Demo staff cannot sign in (random password) and are upserted on
-- fixed UUIDs, so re-runs never duplicate them.
--
-- Requires supabase/seed.sql (lookups + deal stages) to have run first.
-- ============================================================================

-- ── Cleanup of previous demo load (order matters for FKs) ────────────────
delete from public.call_recordings where provider_call_id like 'DEMO-%';
delete from public.tasks where created_by in (
  select id from public.profiles where email like '%@demo.ft-associates.com')
  or assignee_id in (
  select id from public.profiles where email like '%@demo.ft-associates.com');
delete from public.calendar_events where organiser_id in (
  select id from public.profiles where email like '%@demo.ft-associates.com');
delete from public.notifications where profile_id in (
  select id from public.profiles where email like '%@demo.ft-associates.com');
delete from public.practices where legacy_ref like 'DEMO-%';
delete from public.contacts where legacy_ref like 'DEMO-%';

do $$
declare
  -- Fixed ids so re-runs upsert rather than duplicate.
  staff uuid[] := array[
    'd0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000004',
    'd0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000006',
    'd0000000-0000-4000-8000-000000000007','d0000000-0000-4000-8000-000000000008',
    'd0000000-0000-4000-8000-000000000009','d0000000-0000-4000-8000-000000000010']::uuid[];
  staff_names text[] := array['Andy Acton','Chris Strevens','Emma Mumby','Liz Hughes',
    'Electra Giannikou','Henry Stevens','Georgia Ridgewell-May','Drew Acton',
    'Chloe Charalambos','David Brewer'];
  staff_roles text[] := array['admin','manager','agent','agent','agent','agent','agent','manager','agent','agent'];
  staff_colors text[] := array['#B4862A','#2F77BE','#A23B9E','#1F9D4D','#C4382D',
    '#0E7490','#7C3AED','#B45309','#0F766E','#BE185D'];
  has_full_auth boolean;

  funding      uuid[];
  fund_labels  text[] := array['NHS', 'Private', 'Mixed'];
  tenure       uuid[];
  specialisms  uuid[];
  structures   uuid[];
  sources      uuid[];
  positions    uuid[];
  outcomes     uuid[];
  ev_types     uuid[];  -- event type ids aligned with ev_keys
  ev_keys      text[];

  towns    text[] := array['Manchester','Leeds','Liverpool','Sheffield','Birmingham','Nottingham',
                           'Leicester','Bristol','Exeter','Plymouth','Southampton','Brighton',
                           'Reading','Oxford','Cambridge','Norwich','Ipswich','London',
                           'Newcastle','Durham','York','Chester','Cardiff','Swansea'];
  counties text[] := array['Greater Manchester','West Yorkshire','Merseyside','South Yorkshire','West Midlands','Nottinghamshire',
                           'Leicestershire','Bristol','Devon','Devon','Hampshire','East Sussex',
                           'Berkshire','Oxfordshire','Cambridgeshire','Norfolk','Suffolk','London',
                           'Tyne and Wear','County Durham','North Yorkshire','Cheshire','Cardiff','Swansea'];
  lats  double precision[] := array[53.48,53.80,53.41,53.38,52.48,52.95,52.64,51.45,50.72,50.38,50.90,50.82,
                                    51.45,51.75,52.20,52.63,52.06,51.51,54.98,54.78,53.96,53.19,51.48,51.62];
  lngs  double precision[] := array[-2.24,-1.55,-2.99,-1.47,-1.90,-1.15,-1.13,-2.59,-3.53,-4.14,-1.40,-0.14,
                                    -0.97,-1.26,0.12,1.30,1.16,-0.13,-1.61,-1.58,-1.08,-2.89,-3.18,-3.94];
  firstn text[] := array['Sarah','James','Priya','Mohammed','Emma','David','Rachel','Thomas','Aisha','Daniel',
                         'Charlotte','Oliver','Sophie','Benjamin','Grace','Samuel','Hannah','Joseph','Lucy','Matthew',
                         'Chloe','Ryan','Megan','Adam','Laura','Nathan','Olivia','Jack','Amelia','Harry',
                         'Isla','George','Ava','Lewis','Freya','Callum','Ruby','Owen','Alice','Leo'];
  lastn  text[] := array['Patel','Smith','Jones','Williams','Taylor','Brown','Khan','Davies','Wilson','Evans',
                        'Thomas','Roberts','Johnson','Lewis','Walker','Robinson','Wood','Thompson','White','Watson',
                        'Hughes','Green','Hall','Wright','Clarke','Ahmed','Baker','Ali','Cooper','Shah',
                        'Turner','Hill','Ward','Morris','Moore','Clark','Lee','King','Scott','Young'];
  statuses text[] := array['valuation','preparing','available','available','available','available',
                           'under_offer','under_offer','sold_stc','completed','withdrawn'];

  prac       record;
  v_owner    uuid;
  v_buyer    uuid;
  v_seller   uuid;
  v_offer    uuid;
  v_deal     uuid;
  v_amount   numeric;
  n_stages   int;
  i          int;
begin
  -- ── 0. Demo staff ──────────────────────────────────────────────────────
  -- auth.users first (the platform trigger provisions profiles), then upsert
  -- the profile details. Works on hosted Supabase and the local auth stub.
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'aud'
  ) into has_full_auth;

  for i in 1..10 loop
    if has_full_auth then
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change)
      values ('00000000-0000-0000-0000-000000000000', staff[i], 'authenticated', 'authenticated',
        lower(replace(split_part(staff_names[i], ' ', 1), '''', '')) || '.' ||
          lower(replace(replace(split_part(staff_names[i], ' ', 2), '-', ''), '''', '')) || '@demo.ft-associates.com',
        crypt(gen_random_uuid()::text, gen_salt('bf')), -- unguessable: demo staff can't sign in
        now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '')
      on conflict (id) do nothing;
    else
      insert into auth.users (id, email)
      values (staff[i],
        lower(replace(split_part(staff_names[i], ' ', 1), '''', '')) || '.' ||
          lower(replace(replace(split_part(staff_names[i], ' ', 2), '-', ''), '''', '')) || '@demo.ft-associates.com')
      on conflict (id) do nothing;
    end if;

    insert into public.profiles (id, full_name, email, role, calendar_color, threecx_extension, is_active)
    values (staff[i], staff_names[i],
      lower(replace(split_part(staff_names[i], ' ', 1), '''', '')) || '.' ||
        lower(replace(replace(split_part(staff_names[i], ' ', 2), '-', ''), '''', '')) || '@demo.ft-associates.com',
      staff_roles[i], staff_colors[i], (100 + i)::text, true)
    on conflict (id) do update
      set full_name = excluded.full_name, role = excluded.role,
          calendar_color = excluded.calendar_color,
          threecx_extension = excluded.threecx_extension, is_active = true;
  end loop;

  -- ── Lookups ────────────────────────────────────────────────────────────
  select array_agg(lv.id order by lv.sort_order) into funding     from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='funding_type';
  select array_agg(lv.id order by lv.sort_order) into tenure      from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='tenure_type';
  select array_agg(lv.id order by lv.sort_order) into specialisms from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='specialism';
  select array_agg(lv.id order by lv.sort_order) into structures  from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='deal_structure';
  select array_agg(lv.id order by lv.sort_order) into sources     from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='contact_source';
  select array_agg(lv.id order by lv.sort_order) into positions   from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='buyer_position';
  select array_agg(lv.id order by lv.sort_order) into outcomes    from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='call_outcome';
  select array_agg(lv.id order by lv.sort_order), array_agg(lv.system_key order by lv.sort_order)
    into ev_types, ev_keys
    from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='event_type';

  -- ── 1. 100 buyers (owners spread across the team) ─────────────────────
  insert into public.contacts
    (kind, first_name, last_name, email, mobile, town, county, lat, lng, roles, status, temperature,
     source_id, owner_id, consent_email, consent_sms, consent_updated_at, identity_verified, address_verified, legacy_ref)
  select 'person', firstn[idx.fi], lastn[idx.li],
    'buyer' || g || '.' || lower(lastn[idx.li]) || '@example.com',
    '07700' || lpad((900000 + g)::text, 6, '0'),
    towns[idx.ti], counties[idx.ti], lats[idx.ti] + (random()-0.5)*0.03, lngs[idx.ti] + (random()-0.5)*0.03,
    array['buyer'],
    (array['Active','Active','Active','Passive','Under offer'])[1 + (g % 5)],
    (array['hot','warm','cold','warm'])[1 + (g % 4)],
    sources[1 + (g % array_length(sources,1))],
    staff[1 + (g % 10)],
    true, (g % 2 = 0), now() - (g || ' days')::interval, (g % 3 = 0), (g % 4 = 0),
    'DEMO-BUYER-' || g
  from generate_series(1,100) g
  cross join lateral (select 1 + (g % array_length(towns,1)) ti,
                             1 + ((g*7) % array_length(firstn,1)) fi,
                             1 + ((g*13) % array_length(lastn,1)) li) idx;

  insert into public.buyer_criteria
    (contact_id, min_price, max_price, funding_type_ids, tenure_type_ids, specialism_ids,
     buyer_position_id, timescale, finance_status, min_surgeries)
  select c.id, band.lo, band.hi,
    case when random() < 0.7 then array[funding[1 + floor(random()*3)::int]] else '{}'::uuid[] end,
    case when random() < 0.4 then array[tenure[1 + floor(random()*array_length(tenure,1))::int]] else '{}'::uuid[] end,
    case when random() < 0.5 then array[specialisms[1 + floor(random()*array_length(specialisms,1))::int]] else '{}'::uuid[] end,
    positions[1 + floor(random()*array_length(positions,1))::int],
    (array['asap','3m','6m','12m+'])[1 + floor(random()*4)::int],
    (array['cash','mortgage_agreed','mortgage_needed','unknown'])[1 + floor(random()*4)::int],
    (array[1,2,3,4])[1 + floor(random()*4)::int]
  from public.contacts c
  cross join lateral (select (250000 + floor(random()*8)*50000) lo) l1
  cross join lateral (select l1.lo, l1.lo + 250000 + floor(random()*6)*50000 hi) band
  where c.legacy_ref like 'DEMO-BUYER-%';

  insert into public.buyer_search_areas (contact_id, label, lat, lng, radius_miles)
  select c.id, c.town || ' area', c.lat, c.lng, (array[10,15,20,25,30])[1 + floor(random()*5)::int]
  from public.contacts c where c.legacy_ref like 'DEMO-BUYER-%';

  -- ── 2. 100 sellers ─────────────────────────────────────────────────────
  insert into public.contacts
    (kind, title, first_name, last_name, email, mobile, town, county, lat, lng, roles, status,
     source_id, owner_id, consent_email, consent_phone, consent_updated_at, identity_verified, address_verified, legacy_ref)
  select 'person', (array['Dr','Dr','Dr','Mr','Mrs','Ms'])[1 + (g % 6)], firstn[idx.fi], lastn[idx.li],
    'seller' || g || '.' || lower(lastn[idx.li]) || '@example.com',
    '07800' || lpad((100000 + g)::text, 6, '0'),
    towns[idx.ti], counties[idx.ti], lats[idx.ti], lngs[idx.ti],
    array['seller'], 'Active',
    sources[1 + (g % array_length(sources,1))],
    staff[1 + ((g + 4) % 10)],
    (g % 5 <> 0), true, now() - (g || ' days')::interval, (g % 2 = 0), (g % 3 = 0),
    'DEMO-SELLER-' || g
  from generate_series(1,100) g
  cross join lateral (select 1 + ((g*5) % array_length(towns,1)) ti,
                             1 + ((g*11) % array_length(firstn,1)) fi,
                             1 + ((g*3)  % array_length(lastn,1)) li) idx;

  -- ── 3. 50 practices, owned round-robin ────────────────────────────────
  insert into public.practices
    (name, display_title, address_line1, town, county, lat, lng, status, asking_price, price_prefix,
     funding_type_id, tenure_type_id, specialism_ids, deal_structure_ids, surgeries, annual_turnover,
     ebitda, nhs_contract_value, udas, staff_count, description, confidential, owner_id,
     instructed_at, contract_expiry, fee_percent, legacy_ref)
  select
    towns[idx.ti] || ' ' || (array['Dental Practice','Dental Care','Dental Surgery','Family Dental','Smile Clinic'])[1 + (g % 5)],
    surg || '-surgery ' || fund_labels[idx.fi] || ' practice, ' || counties[idx.ti],
    (10 + g) || ' High Street', towns[idx.ti], counties[idx.ti],
    lats[idx.ti] + (random()-0.5)*0.04, lngs[idx.ti] + (random()-0.5)*0.04,
    st,
    round((250000 + surg*150000 + floor(random()*8)*25000)::numeric, -3), 'guide',
    funding[idx.fi], tenure[1 + (g % array_length(tenure,1))],
    case when random() < 0.6 then array[specialisms[1 + floor(random()*array_length(specialisms,1))::int]] else '{}'::uuid[] end,
    array[structures[1 + (g % array_length(structures,1))]],
    surg, round((surg*150000*(0.9 + random()*0.7))::numeric, -3),
    round((surg*150000*0.3)::numeric, -3),
    case when idx.fi in (1,3) then round((surg*90000)::numeric, -3) else null end,
    case when idx.fi in (1,3) then 4000 + surg*1200 else null end,
    4 + surg + floor(random()*6)::int,
    'A well-established ' || fund_labels[idx.fi] || ' dental practice in ' || towns[idx.ti] || ' with ' || surg ||
      ' surgeries. Loyal patient base, experienced associates in place and strong, consistent trading. Offered on a confidential basis.',
    true, staff[1 + ((g*3) % 10)],
    current_date - (30 + floor(random()*300)::int), current_date + (60 + floor(random()*300)::int),
    (array[8,9,10,7.5])[1 + (g % 4)],
    'DEMO-PRACTICE-' || g
  from generate_series(1,50) g
  cross join lateral (select 1 + (g % array_length(towns,1)) ti, 1 + (g % 3) fi) idx
  cross join lateral (select 2 + (g % 7) surg) s
  cross join lateral (select statuses[1 + (g % array_length(statuses,1))] st) stt;

  -- ── 4. People on each practice ────────────────────────────────────────
  insert into public.practice_contacts (practice_id, contact_id, role, is_primary)
  select p.id, s.id, 'seller', true
  from (select id, row_number() over (order by legacy_ref) rn from public.practices where legacy_ref like 'DEMO-PRACTICE-%') p
  join (select id, row_number() over (order by legacy_ref) rn from public.contacts where legacy_ref like 'DEMO-SELLER-%') s
    on s.rn = p.rn;

  insert into public.practice_contacts (practice_id, contact_id, role, is_primary)
  select p.id, s.id, 'seller', false
  from (select id, row_number() over (order by legacy_ref) rn from public.practices where legacy_ref like 'DEMO-PRACTICE-%') p
  join (select id, row_number() over (order by legacy_ref) rn from public.contacts where legacy_ref like 'DEMO-SELLER-%') s
    on s.rn = p.rn + 50
  where p.rn <= 30 and random() < 0.6
  on conflict do nothing;

  insert into public.practice_contacts (practice_id, contact_id, role, is_primary)
  select p.id, b.id, 'buyer', false
  from public.practices p
  join lateral (
    select c.id from public.contacts c
    where c.legacy_ref like 'DEMO-BUYER-%'
    order by md5(p.id::text || c.id::text)
    limit (2 + floor(random()*4)::int)
  ) b on true
  where p.legacy_ref like 'DEMO-PRACTICE-%'
  on conflict do nothing;

  -- ── 5. Offers + deals across the stages ───────────────────────────────
  for prac in
    select id, asking_price, status, owner_id, created_at from public.practices
    where legacy_ref like 'DEMO-PRACTICE-%' and status in ('under_offer','sold_stc','completed')
  loop
    v_owner := coalesce(prac.owner_id, staff[1]);
    select contact_id into v_buyer from public.practice_contacts
      where practice_id = prac.id and role = 'buyer' order by random() limit 1;
    select contact_id into v_seller from public.practice_contacts
      where practice_id = prac.id and role = 'seller' and is_primary order by created_at limit 1;
    if v_buyer is null then continue; end if;

    v_amount := round((prac.asking_price * (0.9 + random()*0.1)) / 1000) * 1000;

    insert into public.offers (practice_id, buyer_contact_id, amount, status, offer_date, finance_status, accepted_at, created_by)
    values (prac.id, v_buyer, v_amount, 'accepted', current_date - 45, 'mortgage_agreed', now() - interval '45 days', v_owner)
    returning id into v_offer;

    insert into public.offers (practice_id, buyer_contact_id, amount, status, offer_date, declined_reason, created_by)
    select prac.id, contact_id, round(prac.asking_price * 0.87 / 1000) * 1000, 'declined', current_date - 50,
           'Lower than the accepted offer', v_owner
    from public.practice_contacts
    where practice_id = prac.id and role = 'buyer' and contact_id <> v_buyer
    order by random() limit 1;

    insert into public.deals (practice_id, offer_id, buyer_contact_id, seller_contact_id, agreed_price,
                              status, target_completion_date, owner_id)
    values (prac.id, v_offer, v_buyer, v_seller, v_amount, 'in_progress',
            current_date + 30 + floor(random()*60)::int, v_owner)
    returning id into v_deal;

    n_stages := case prac.status
                  when 'under_offer' then 2 + floor(random()*2)::int
                  when 'sold_stc'    then 5 + floor(random()*2)::int
                  else 7 end;

    insert into public.deal_stage_events (deal_id, stage_id, achieved_on, recorded_by)
    select v_deal, ds.id, current_date - ((n_stages - ds.sort_order + 1) * 7), v_owner
    from public.deal_stages ds
    where ds.sort_order <= n_stages
    order by ds.sort_order;

    if n_stages >= 7 then
      update public.deals
        set status = 'completed', completed_at = current_date - floor(random()*20)::int,
            current_stage_id = (select id from public.deal_stages where key = 'completion')
        where id = v_deal;
    else
      update public.deals
        set current_stage_id = (select id from public.deal_stages where sort_order = n_stages + 1)
        where id = v_deal;
    end if;
  end loop;

  insert into public.offers (practice_id, buyer_contact_id, amount, status, offer_date, finance_status, created_by)
  select p.id, pc.contact_id, round(p.asking_price * 0.94 / 1000) * 1000, 'pending', current_date - floor(random()*10)::int,
         (array['cash','mortgage_agreed','mortgage_needed'])[1 + floor(random()*3)::int], coalesce(p.owner_id, staff[1])
  from public.practices p
  join lateral (select contact_id from public.practice_contacts where practice_id = p.id and role = 'buyer' order by random() limit 1) pc on true
  where p.legacy_ref like 'DEMO-PRACTICE-%' and p.status = 'available' and random() < 0.35;

  -- ── 6. Correspondence ─────────────────────────────────────────────────
  insert into public.journal_entries (entry_type, body, practice_id, occurred_at)
  select 'system',
    'Practice instructed and prepared for market. Marketing details approved and confidential listing live.',
    id, greatest(created_at, now() - (random()*100 || ' days')::interval)
  from public.practices where legacy_ref like 'DEMO-PRACTICE-%';

  insert into public.journal_entries (entry_type, body, contact_id, practice_id, occurred_at, author_id, call_direction, call_outcome_id)
  select 'call',
    format((array[
      'Spoke with %1$s about progress on %2$s. Reassured them on buyer interest and agreed to circulate to the vetted list again.',
      'Called %1$s for a catch-up on %2$s. They are keen to keep momentum; discussed timing and next steps.',
      'Update call with %1$s regarding %2$s. Went through recent enquiries and the plan for the coming fortnight.'
    ])[1 + (abs(hashtext(c.id::text)) % 3)], c.first_name, p.display_title),
    c.id, p.id, now() - (random()*90 || ' days')::interval, coalesce(c.owner_id, p.owner_id),
    'outbound', outcomes[1 + floor(random()*array_length(outcomes,1))::int]
  from public.practice_contacts pc
  join public.practices p on p.id = pc.practice_id
  join public.contacts c on c.id = pc.contact_id
  where pc.role = 'seller' and p.legacy_ref like 'DEMO-PRACTICE-%';

  insert into public.journal_entries (entry_type, subject, body, contact_id, practice_id, occurred_at, author_id)
  select 'email',
    'Update on the sale of ' || p.display_title,
    format('Dear %1$s,%3$sThank you for your time this week. We continue to see good engagement on %2$s from our registered buyers and will keep you posted on viewing requests and any offers as they come in.%3$sKind regards,%3$sFrank Taylor & Associates',
           c.first_name, p.display_title, E'\n\n'),
    c.id, p.id, now() - (random()*80 || ' days')::interval, coalesce(c.owner_id, p.owner_id)
  from public.practice_contacts pc
  join public.practices p on p.id = pc.practice_id
  join public.contacts c on c.id = pc.contact_id
  where pc.role = 'seller' and pc.is_primary and p.legacy_ref like 'DEMO-PRACTICE-%';

  insert into public.journal_entries (entry_type, subject, body, contact_id, practice_id, occurred_at, author_id)
  select 'email',
    'Confidential opportunity: ' || p.display_title,
    format('Dear %1$s,%3$sBased on your search criteria I thought of you for %2$s, which we have just brought to market. I''ve attached the confidential summary — do let me know if you''d like to arrange a viewing or discuss further.%3$sBest wishes,%3$sFrank Taylor & Associates',
           c.first_name, p.display_title, E'\n\n'),
    c.id, p.id, now() - (random()*70 || ' days')::interval, coalesce(p.owner_id, c.owner_id)
  from public.practice_contacts pc
  join public.practices p on p.id = pc.practice_id
  join public.contacts c on c.id = pc.contact_id
  where pc.role = 'buyer' and p.legacy_ref like 'DEMO-PRACTICE-%';

  insert into public.journal_entries (entry_type, body, contact_id, practice_id, occurred_at, author_id, call_direction, call_outcome_id)
  select 'call',
    format((array[
      'Called %1$s to gauge interest in %2$s. Positive — asked to see the last three years'' accounts.',
      'Spoke with %1$s about %2$s. Wants to arrange a viewing in the next fortnight; finance already in place.',
      'Left a voicemail for %1$s regarding %2$s and followed up by email.'
    ])[1 + (abs(hashtext(c.id::text || p.id::text)) % 3)], c.first_name, p.display_title),
    c.id, p.id, now() - (random()*60 || ' days')::interval, coalesce(p.owner_id, c.owner_id),
    'outbound', outcomes[1 + floor(random()*array_length(outcomes,1))::int]
  from public.practice_contacts pc
  join public.practices p on p.id = pc.practice_id
  join public.contacts c on c.id = pc.contact_id
  where pc.role = 'buyer' and p.legacy_ref like 'DEMO-PRACTICE-%'
    and abs(hashtext(c.id::text || p.id::text)) % 2 = 0;

  insert into public.journal_entries (entry_type, body, deal_id, practice_id, occurred_at, author_id)
  select 'note',
    (array[
      'Memorandum of sale issued to both solicitors. Buyer''s AML checks underway.',
      'Chased local authority searches — expected back within two weeks.',
      'Buyer''s bank valuation booked. CQC registration application in progress.',
      'Weekly update call held with both parties; all on track for target completion.'
    ])[1 + (s.n % 4)],
    d.id, d.practice_id, now() - (s.n * 9 || ' days')::interval, coalesce(d.owner_id, staff[1])
  from public.deals d
  join public.practices p on p.id = d.practice_id
  cross join lateral generate_series(1, 3) s(n)
  where p.legacy_ref like 'DEMO-PRACTICE-%';

  -- ── 7. AI call capture: 10 transcribed + analysed calls ───────────────
  -- Summaries land on the buyer/seller journals automatically; some calls
  -- have tasks already accepted (created + assigned to the agent on the
  -- call), the most recent still have pending suggestions to review.
  declare
    d_contact uuid; d_practice uuid; d_entry uuid; d_call uuid;
    d_title text; d_name text; d_agent uuid; d_agent_name text; d_ext text;
    is_seller boolean; scenario int; call_time timestamptz;
    smry text; transcript text;
  begin
    for i in 1..10 loop
      is_seller := (i % 3 = 0);
      scenario := 1 + (i % 5);
      select c.id, p.id, p.display_title, c.first_name,
             coalesce(c.owner_id, p.owner_id, staff[1 + (i % 10)])
        into d_contact, d_practice, d_title, d_name, d_agent
      from public.practice_contacts pc
      join public.contacts c on c.id = pc.contact_id
      join public.practices p on p.id = pc.practice_id
      where pc.role = (case when is_seller then 'seller' else 'buyer' end)
        and p.legacy_ref like 'DEMO-PRACTICE-%' and p.status in ('available','under_offer','sold_stc')
      order by md5('call' || i::text || pc.id::text) limit 1;
      exit when d_contact is null;
      select full_name, threecx_extension into d_agent_name, d_ext from public.profiles where id = d_agent;
      call_time := now() - ((i * 7) || ' hours')::interval;

      transcript :=
        'Agent: Good morning, ' || split_part(d_agent_name, ' ', 1) || ' from Frank Taylor & Associates. Am I speaking with ' || d_name || '?' || E'\n' ||
        'Caller: Yes, speaking.' || E'\n' ||
        case scenario
          when 1 then
            'Agent: I''m calling about ' || d_title || ' — you asked for the accounts before deciding on a viewing.' || E'\n' ||
            'Caller: That''s right. Three years'' worth if possible, and the NHS contract detail.' || E'\n' ||
            'Agent: Of course. Once your NDA is on file I''ll send the full confidential pack today.' || E'\n' ||
            'Caller: My funding is agreed in principle, so if the numbers stack up I can move quickly.' || E'\n' ||
            'Agent: Understood. Shall I pencil a viewing for late next week while you review?' || E'\n' ||
            'Caller: Yes, do that. Send the pack over and I''ll confirm by Friday.'
          when 2 then
            'Agent: A quick update on ' || d_title || ' — two more buyers viewed this week.' || E'\n' ||
            'Caller: Good. Any feedback from the couple who came on Tuesday?' || E'\n' ||
            'Agent: Positive on the premises, some questions on associate coverage. I''ve sent the staffing summary.' || E'\n' ||
            'Caller: If nothing firms up in three weeks I''d like to talk about the guide price.' || E'\n' ||
            'Agent: That''s sensible. I''ll diarise a price review and send you a written summary every Friday.' || E'\n' ||
            'Caller: Perfect. I''ll get the updated staff rota to you by Friday as well.'
          when 3 then
            'Agent: You viewed ' || d_title || ' last week — I wanted your thoughts.' || E'\n' ||
            'Caller: We liked it a lot. The location works and the fit-out is better than expected.' || E'\n' ||
            'Agent: Any concerns I can address before you decide?' || E'\n' ||
            'Caller: Just the lease terms. If the landlord will do a new fifteen-year term, we''re minded to offer.' || E'\n' ||
            'Agent: I''ll raise it with the seller''s solicitor today and come back to you by Wednesday.' || E'\n' ||
            'Caller: Do that and we''ll put something formal in writing this week.'
          when 4 then
            'Agent: I''m ringing about the offer on ' || d_title || '. The seller has come back at a small premium to your figure.' || E'\n' ||
            'Caller: How far apart are we?' || E'\n' ||
            'Agent: About three per cent. My sense is a meeting in the middle gets it agreed.' || E'\n' ||
            'Caller: I can stretch half way if the equipment schedule is included in full.' || E'\n' ||
            'Agent: I think that lands. I''ll put it to the seller this afternoon and call you back tomorrow morning.' || E'\n' ||
            'Caller: Fine — I''ll have my accountant on standby to reconfirm the funding letter.'
          else
            'Agent: Checking in on the sale — your solicitor is waiting on the CQC registration reference.' || E'\n' ||
            'Caller: I submitted the application Monday; the reference should land any day.' || E'\n' ||
            'Agent: Excellent. Searches are back and the bank valuation is booked for Thursday.' || E'\n' ||
            'Caller: Are we still realistic for completion at the end of next month?' || E'\n' ||
            'Agent: Yes — provided the CQC reference arrives this week. Forward it to me the moment it does.' || E'\n' ||
            'Caller: Will do. Let''s speak after the valuation on Thursday.'
        end;

      smry := case scenario
        when 1 then 'Buyer remains keen on ' || d_title || '. Wants three years'' accounts and NHS contract detail before viewing; funding agreed in principle. Agent to send the confidential pack today (NDA to check) and pencil a viewing for late next week; buyer to confirm by Friday.'
        when 2 then 'Seller update on ' || d_title || ': two viewings this week, feedback shared. Agreed a written summary every Friday and a guide-price review if nothing firms up within three weeks. Seller to send the updated staff rota by Friday.'
        when 3 then 'Post-viewing debrief on ' || d_title || ': buyer positive, decision hinges on the landlord granting a new 15-year lease. Agent to raise lease terms with the seller''s solicitor and revert by Wednesday; buyer intends to offer formally this week.'
        when 4 then 'Offer negotiation on ' || d_title || ': ~3% gap. Buyer will meet half way if the full equipment schedule is included. Agent to put the revised figure to the seller this afternoon and call the buyer back tomorrow morning.'
        else 'Progression call on ' || d_title || ': CQC application submitted, searches back, bank valuation Thursday. Completion end of next month remains realistic if the CQC reference arrives this week; contact to forward it on receipt.'
      end;

      insert into public.journal_entries (entry_type, body, author_id, contact_id, practice_id, call_direction, occurred_at)
      values ('call', smry, d_agent, d_contact, d_practice,
        case when i % 2 = 0 then 'inbound' else 'outbound' end, call_time)
      returning id into d_entry;

      insert into public.call_recordings
        (provider_call_id, journal_entry_id, contact_id, practice_id, profile_id, direction,
         external_number, extension, started_at, duration_secs, transcript, transcript_status,
         analysis_status, summary, match_status)
      values ('DEMO-CALL-' || i, d_entry, d_contact, d_practice, d_agent,
        case when i % 2 = 0 then 'inbound' else 'outbound' end,
        '+4477009001' || lpad(i::text, 2, '0'), d_ext, call_time, 240 + i * 40,
        transcript, 'transcribed', 'analysed', smry, 'matched')
      returning id into d_call;

      if i <= 4 then
        -- Most recent calls: suggestions still pending review.
        insert into public.ai_suggestions (kind, payload, call_recording_id, journal_entry_id, contact_id, practice_id, for_profile_id)
        values
          ('task', jsonb_build_object(
             'title', case scenario
               when 1 then 'Send confidential pack (3 yrs accounts + NHS detail) to ' || d_name
               when 2 then 'Send Friday written summary to ' || d_name
               when 3 then 'Raise 15-year lease request with seller''s solicitor'
               when 4 then 'Put revised figure to the seller — ' || d_title
               else 'Chase CQC registration reference from ' || d_name end,
             'details', 'Committed on the call — see the AI summary and transcript.',
             'due_at', (call_time + interval '1 day')::text),
           d_call, d_entry, d_contact, d_practice, d_agent),
          ('task', jsonb_build_object(
             'title', case scenario
               when 1 then 'Pencil viewing at ' || d_title || ' for late next week'
               when 2 then 'Diarise guide-price review — ' || d_title
               when 3 then 'Call ' || d_name || ' back by Wednesday on lease terms'
               when 4 then 'Call ' || d_name || ' back tomorrow morning with the seller''s answer'
               else 'Confirm completion timeline after Thursday''s bank valuation' end,
             'details', 'Follow-up commitment from the call.',
             'due_at', (call_time + interval '3 days')::text),
           d_call, d_entry, d_contact, d_practice, d_agent);
        if scenario in (1, 3) then
          insert into public.ai_suggestions (kind, payload, call_recording_id, journal_entry_id, contact_id, practice_id, for_profile_id)
          values ('email_draft', jsonb_build_object(
            'subject', 'Following our call — ' || d_title,
            'body', 'Dear ' || d_name || ',' || E'\n\n' ||
              'Thank you for your time on the phone today. To confirm what we agreed: ' ||
              case scenario
                when 1 then 'I will send the confidential pack, including three years'' accounts and the NHS contract detail, once your NDA is on file, and I''ll propose viewing times for late next week.'
                else 'I am raising the question of a new fifteen-year lease with the seller''s solicitor today and will come back to you by Wednesday.' end || E'\n\n' ||
              'Kind regards' || E'\n' || d_agent_name || E'\n' || 'Frank Taylor & Associates'),
            d_call, d_entry, d_contact, d_practice, d_agent);
        end if;
      else
        -- Older calls: the agent already approved the AI's tasks — they sit
        -- in the task list, assigned to whoever had the call.
        insert into public.tasks (title, details, due_at, assignee_id, created_by, status, contact_id, practice_id, completed_at, created_at)
        values
          (case scenario
             when 1 then 'Send confidential pack to ' || d_name
             when 2 then 'Send Friday written summary to ' || d_name
             when 3 then 'Raise lease terms with seller''s solicitor — ' || d_title
             when 4 then 'Relay revised offer to seller — ' || d_title
             else 'Chase CQC reference from ' || d_name end,
           'Suggested by AI from a call — approved by ' || d_agent_name || '.',
           call_time + interval '1 day', d_agent, d_agent,
           case when i % 2 = 0 then 'done' else 'open' end,
           d_contact, d_practice,
           case when i % 2 = 0 then call_time + interval '20 hours' else null end,
           call_time),
          (case scenario
             when 1 then 'Book viewing at ' || d_title
             when 2 then 'Guide-price review — ' || d_title
             when 3 then 'Call ' || d_name || ' with solicitor''s answer'
             when 4 then 'Call ' || d_name || ' with seller''s decision'
             else 'Post-valuation completion check — ' || d_title end,
           'Suggested by AI from a call — approved by ' || d_agent_name || '.',
           call_time + interval '3 days', d_agent, d_agent, 'open',
           d_contact, d_practice, null, call_time);
      end if;
    end loop;

    -- ── 8. Launch outreach flag (go-to-market) ──────────────────────────
    select p.id, p.display_title, p.owner_id into d_practice, d_title, d_agent
    from public.practices p
    where p.legacy_ref like 'DEMO-PRACTICE-%' and p.status = 'available'
    order by p.legacy_ref limit 1;
    if d_practice is not null then
      insert into public.ai_suggestions (kind, payload, practice_id, for_profile_id)
      select 'outreach',
        jsonb_build_object(
          'title', count(*) || ' matched buyers for launch',
          'total', count(*),
          'buyers', jsonb_agg(jsonb_build_object(
            'contact_id', b.id, 'name', b.first_name || ' ' || b.last_name,
            'score', 70 + (abs(hashtext(b.id::text)) % 28),
            'temperature', b.temperature,
            'facets', jsonb_build_array('Price in range', 'Area match')))),
        d_practice, d_agent
      from (
        select c.id, c.first_name, c.last_name, c.temperature
        from public.contacts c
        where c.legacy_ref like 'DEMO-BUYER-%' and not c.do_not_contact
        order by md5(d_practice::text || c.id::text) limit 8
      ) b;
      insert into public.journal_entries (entry_type, body, practice_id)
      values ('system', 'Gone to market: matching buyers identified automatically — top targets flagged for outreach.', d_practice);
    end if;
  end;

  -- ── 9 + 10. Tasks and calendar for EVERY active person ────────────────
  -- Loops over all active profiles — the 10 demo staff AND any real users
  -- (e.g. the signed-in admin) — so everyone's My Day, task list and
  -- calendar overlay show a realistic spread: overdue / due-today /
  -- upcoming tasks, and diary events including at least two today.
  -- Demo rows stay separable: tasks are created_by demo staff and events are
  -- organised by demo staff, which is exactly what the cleanup at the top
  -- deletes — anything a real user creates themselves is never touched.
  declare
    person record;
    creator uuid;
    ev_id uuid; ev_type_id uuid; ev_start timestamptz;
    p_id uuid; p_title text; att uuid;
    c_id uuid; c_name text;
    pi int := 0;
    j int;
    -- per-person event plan: day offset, start hour, minutes, kind
    ev_day  int[]  := array[-4, -2, 0,  0,  1,  3,  6];
    ev_hour int[]  := array[ 9, 14, 10, 14, 11,  9, 15];
    ev_min  int[]  := array[ 0, 30,  0, 30,  0, 30,  0];
    -- kinds: 1 valuation, 2 viewing, 3+ meetings
    ev_kind int[]  := array[ 3,  1,  2,  3,  3,  1,  3];
    meeting_titles text[] := array['Pipeline review','Buyer pool triage','1:1 catch-up',
                                   'Completion planning','Marketing planning','Team stand-up'];
    task_day  int[] := array[-2, 0, 1, 3, 6];
    task_titles text[] := array['Chase outstanding NDA','Call re valuation follow-up',
                                'Send comparable evidence','Confirm viewing feedback',
                                'Prepare marketing summary','Update buyer criteria after call'];
  begin
    for person in
      select id, full_name from public.profiles where is_active order by created_at limit 40
    loop
      pi := pi + 1;
      creator := staff[1 + (pi % 10)];

      -- 5 tasks: overdue, due today, then upcoming; one already done
      for j in 1..5 loop
        select id, first_name || ' ' || last_name into c_id, c_name
        from public.contacts where legacy_ref like 'DEMO-%'
        order by md5('ptask' || pi::text || j::text || legacy_ref) limit 1;
        insert into public.tasks (title, details, due_at, assignee_id, created_by, status, contact_id, completed_at, created_at)
        values (
          task_titles[1 + ((pi + j) % 6)] || case when j % 2 = 0 then ' — ' || c_name else '' end,
          null,
          date_trunc('day', now()) + (task_day[j] || ' days')::interval + interval '17 hours',
          person.id, creator,
          case when j = 4 then 'done' else 'open' end,
          c_id,
          case when j = 4 then now() - interval '1 day' else null end,
          now() - interval '5 days');
      end loop;

      -- 7 diary events, two of them today
      for j in 1..7 loop
        ev_start := date_trunc('day', now()) + (ev_day[j] || ' days')::interval
                    + (ev_hour[j] || ' hours')::interval + (ev_min[j] || ' minutes')::interval;

        if ev_kind[j] in (1, 2) then
          select id, display_title into p_id, p_title from public.practices
          where legacy_ref like 'DEMO-PRACTICE-%'
          order by md5('pev' || pi::text || j::text || legacy_ref) limit 1;
          select lv.id into ev_type_id from public.lookup_values lv
            join public.lookup_types lt on lt.id = lv.lookup_type_id
            where lt.key = 'event_type' and lv.system_key = (case when ev_kind[j] = 1 then 'valuation' else 'viewing' end);
          insert into public.calendar_events (title, event_type_id, starts_at, ends_at, organiser_id, practice_id, status, sync_state, created_by)
          values ((case when ev_kind[j] = 1 then 'Valuation — ' else 'Viewing — ' end) || p_title,
                  ev_type_id, ev_start, ev_start + interval '1 hour', creator, p_id, 'confirmed', 'local', creator)
          returning id into ev_id;
        else
          select lv.id into ev_type_id from public.lookup_values lv
            join public.lookup_types lt on lt.id = lv.lookup_type_id
            where lt.key = 'event_type' and lv.system_key = 'meeting';
          insert into public.calendar_events (title, event_type_id, starts_at, ends_at, organiser_id, status, sync_state, created_by)
          values (meeting_titles[1 + ((pi + j) % 6)],
                  ev_type_id, ev_start, ev_start + interval '45 minutes', creator, 'confirmed', 'local', creator)
          returning id into ev_id;
        end if;

        -- the person is always on the invite; organiser too; meetings gain a third
        insert into public.calendar_event_attendees (event_id, profile_id) values (ev_id, person.id);
        if creator <> person.id then
          insert into public.calendar_event_attendees (event_id, profile_id) values (ev_id, creator);
        end if;
        if ev_kind[j] >= 3 and j % 3 = 0 then
          att := staff[1 + ((pi + j + 4) % 10)];
          if att <> person.id and att <> creator then
            insert into public.calendar_event_attendees (event_id, profile_id) values (ev_id, att);
          end if;
        end if;
      end loop;
    end loop;
  end;

  raise notice 'demo data loaded: staff, contacts, practices, calls, and per-person tasks + calendar';
end $$;
