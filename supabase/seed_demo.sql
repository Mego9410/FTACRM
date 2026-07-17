-- ============================================================================
-- FTA CRM — DEMO DATA
-- 100 buyer contacts, 100 seller contacts, 50 practices with linked sellers &
-- interested buyers, offers, deals across the progression stages, and a full
-- set of correspondence (calls, notes, emails) between agents, contacts and
-- practices so every section has realistic data to explore.
--
-- Safe to re-run: every demo row is tagged with a `DEMO-…` legacy_ref, and the
-- top of this script deletes those first (cascades clean up links, offers,
-- deals, journal, criteria and areas). It never touches real records.
--
-- Requires the base seed (supabase/seed.sql) to have run first (lookups + deal
-- stages). Owner/author attribution uses the earliest profile if one exists,
-- otherwise NULL — so it works whether or not you've created users yet.
-- ============================================================================

delete from public.practices where legacy_ref like 'DEMO-%';
delete from public.contacts where legacy_ref like 'DEMO-%';

do $$
declare
  funding      uuid[];
  fund_labels  text[] := array['NHS', 'Private', 'Mixed'];
  tenure       uuid[];
  specialisms  uuid[];
  structures   uuid[];
  sources      uuid[];
  positions    uuid[];
  outcomes     uuid[];
  owner        uuid;

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
  v_buyer    uuid;
  v_seller   uuid;
  v_offer    uuid;
  v_deal     uuid;
  v_amount   numeric;
  n_stages   int;
begin
  select array_agg(lv.id order by lv.sort_order) into funding     from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='funding_type';
  select array_agg(lv.id order by lv.sort_order) into tenure      from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='tenure_type';
  select array_agg(lv.id order by lv.sort_order) into specialisms from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='specialism';
  select array_agg(lv.id order by lv.sort_order) into structures  from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='deal_structure';
  select array_agg(lv.id order by lv.sort_order) into sources      from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='contact_source';
  select array_agg(lv.id order by lv.sort_order) into positions    from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='buyer_position';
  select array_agg(lv.id order by lv.sort_order) into outcomes     from public.lookup_values lv join public.lookup_types lt on lt.id=lv.lookup_type_id where lt.key='call_outcome';
  select id into owner from public.profiles order by created_at limit 1;

  -- ── 100 buyers ──────────────────────────────────────────────────────────
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
    sources[1 + (g % array_length(sources,1))], owner,
    true, (g % 2 = 0), now() - (g || ' days')::interval, (g % 3 = 0), (g % 4 = 0),
    'DEMO-BUYER-' || g
  from generate_series(1,100) g
  cross join lateral (select 1 + (g % array_length(towns,1)) ti,
                             1 + ((g*7) % array_length(firstn,1)) fi,
                             1 + ((g*13) % array_length(lastn,1)) li) idx;

  -- buyer criteria + one search area each
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

  -- ── 100 sellers ─────────────────────────────────────────────────────────
  insert into public.contacts
    (kind, title, first_name, last_name, email, mobile, town, county, lat, lng, roles, status,
     source_id, owner_id, consent_email, consent_phone, consent_updated_at, identity_verified, address_verified, legacy_ref)
  select 'person', (array['Dr','Dr','Dr','Mr','Mrs','Ms'])[1 + (g % 6)], firstn[idx.fi], lastn[idx.li],
    'seller' || g || '.' || lower(lastn[idx.li]) || '@example.com',
    '07800' || lpad((100000 + g)::text, 6, '0'),
    towns[idx.ti], counties[idx.ti], lats[idx.ti], lngs[idx.ti],
    array['seller'], 'Active',
    sources[1 + (g % array_length(sources,1))], owner,
    (g % 5 <> 0), true, now() - (g || ' days')::interval, (g % 2 = 0), (g % 3 = 0),
    'DEMO-SELLER-' || g
  from generate_series(1,100) g
  cross join lateral (select 1 + ((g*5) % array_length(towns,1)) ti,
                             1 + ((g*11) % array_length(firstn,1)) fi,
                             1 + ((g*3)  % array_length(lastn,1)) li) idx;

  -- ── 50 practices ────────────────────────────────────────────────────────
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
    true, owner,
    current_date - (30 + floor(random()*300)::int), current_date + (60 + floor(random()*300)::int),
    (array[8,9,10,7.5])[1 + (g % 4)],
    'DEMO-PRACTICE-' || g
  from generate_series(1,50) g
  cross join lateral (select 1 + (g % array_length(towns,1)) ti, 1 + (g % 3) fi) idx
  cross join lateral (select 2 + (g % 7) surg) s
  cross join lateral (select statuses[1 + (g % array_length(statuses,1))] st) stt;

  -- ── Link primary sellers (practice #n ↔ seller #n) ──────────────────────
  insert into public.practice_contacts (practice_id, contact_id, role, is_primary)
  select p.id, s.id, 'seller', true
  from (select id, row_number() over (order by legacy_ref) rn from public.practices where legacy_ref like 'DEMO-PRACTICE-%') p
  join (select id, row_number() over (order by legacy_ref) rn from public.contacts where legacy_ref like 'DEMO-SELLER-%') s
    on s.rn = p.rn;

  -- a co-owner second seller on ~30% of practices (sellers 51-80)
  insert into public.practice_contacts (practice_id, contact_id, role, is_primary)
  select p.id, s.id, 'seller', false
  from (select id, row_number() over (order by legacy_ref) rn from public.practices where legacy_ref like 'DEMO-PRACTICE-%') p
  join (select id, row_number() over (order by legacy_ref) rn from public.contacts where legacy_ref like 'DEMO-SELLER-%') s
    on s.rn = p.rn + 50
  where p.rn <= 30 and random() < 0.6
  on conflict do nothing;

  -- ── Interested buyers: 2-5 per practice ────────────────────────────────
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

  -- ── Offers + deals for practices past offer stage ───────────────────────
  for prac in
    select id, asking_price, status, created_at from public.practices
    where legacy_ref like 'DEMO-PRACTICE-%' and status in ('under_offer','sold_stc','completed')
  loop
    select contact_id into v_buyer from public.practice_contacts
      where practice_id = prac.id and role = 'buyer' order by random() limit 1;
    select contact_id into v_seller from public.practice_contacts
      where practice_id = prac.id and role = 'seller' and is_primary order by created_at limit 1;
    if v_buyer is null then continue; end if;

    v_amount := round((prac.asking_price * (0.9 + random()*0.1)) / 1000) * 1000;

    insert into public.offers (practice_id, buyer_contact_id, amount, status, offer_date, finance_status, accepted_at, created_by)
    values (prac.id, v_buyer, v_amount, 'accepted', current_date - 45, 'mortgage_agreed', now() - interval '45 days', owner)
    returning id into v_offer;

    -- a rival declined offer, where another interested buyer exists
    insert into public.offers (practice_id, buyer_contact_id, amount, status, offer_date, declined_reason, created_by)
    select prac.id, contact_id, round(prac.asking_price * 0.87 / 1000) * 1000, 'declined', current_date - 50,
           'Lower than the accepted offer', owner
    from public.practice_contacts
    where practice_id = prac.id and role = 'buyer' and contact_id <> v_buyer
    order by random() limit 1;

    insert into public.deals (practice_id, offer_id, buyer_contact_id, seller_contact_id, agreed_price,
                              status, target_completion_date, owner_id)
    values (prac.id, v_offer, v_buyer, v_seller, v_amount, 'in_progress',
            current_date + 30 + floor(random()*60)::int, owner)
    returning id into v_deal;

    n_stages := case prac.status
                  when 'under_offer' then 2 + floor(random()*2)::int   -- 2-3 stages in
                  when 'sold_stc'    then 5 + floor(random()*2)::int   -- 5-6 stages in
                  else 7 end;                                          -- completed: all 7

    insert into public.deal_stage_events (deal_id, stage_id, achieved_on, recorded_by)
    select v_deal, ds.id, current_date - ((n_stages - ds.sort_order + 1) * 7), owner
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

  -- a few pending offers on still-available practices (for the "pending offers" list)
  insert into public.offers (practice_id, buyer_contact_id, amount, status, offer_date, finance_status, created_by)
  select p.id, pc.contact_id, round(p.asking_price * 0.94 / 1000) * 1000, 'pending', current_date - floor(random()*10)::int,
         (array['cash','mortgage_agreed','mortgage_needed'])[1 + floor(random()*3)::int], owner
  from public.practices p
  join lateral (select contact_id from public.practice_contacts where practice_id = p.id and role = 'buyer' order by random() limit 1) pc on true
  where p.legacy_ref like 'DEMO-PRACTICE-%' and p.status = 'available' and random() < 0.35;

  -- ── Correspondence ──────────────────────────────────────────────────────
  -- 1. Instruction system note per practice
  insert into public.journal_entries (entry_type, body, practice_id, occurred_at)
  select 'system',
    'Practice instructed and prepared for market. Marketing details approved and confidential listing live.',
    id, greatest(created_at, now() - (random()*100 || ' days')::interval)
  from public.practices where legacy_ref like 'DEMO-PRACTICE-%';

  -- 2. Seller calls (linked to seller contact + practice)
  insert into public.journal_entries (entry_type, body, contact_id, practice_id, occurred_at, author_id, call_direction, call_outcome_id)
  select 'call',
    format((array[
      'Spoke with %1$s about progress on %2$s. Reassured them on buyer interest and agreed to circulate to the vetted list again.',
      'Called %1$s for a catch-up on %2$s. They are keen to keep momentum; discussed timing and next steps.',
      'Update call with %1$s regarding %2$s. Went through recent enquiries and the plan for the coming fortnight.'
    ])[1 + (abs(hashtext(c.id::text)) % 3)], c.first_name, p.display_title),
    c.id, p.id, now() - (random()*90 || ' days')::interval, coalesce(c.owner_id, p.owner_id, owner),
    'outbound', outcomes[1 + floor(random()*array_length(outcomes,1))::int]
  from public.practice_contacts pc
  join public.practices p on p.id = pc.practice_id
  join public.contacts c on c.id = pc.contact_id
  where pc.role = 'seller' and p.legacy_ref like 'DEMO-PRACTICE-%';

  -- 3. Seller emails
  insert into public.journal_entries (entry_type, subject, body, contact_id, practice_id, occurred_at, author_id)
  select 'email',
    'Update on the sale of ' || p.display_title,
    format('Dear %1$s,%3$sThank you for your time this week. We continue to see good engagement on %2$s from our registered buyers and will keep you posted on viewing requests and any offers as they come in.%3$sKind regards,%3$sFrank Taylor & Associates',
           c.first_name, p.display_title, E'\n\n'),
    c.id, p.id, now() - (random()*80 || ' days')::interval, coalesce(c.owner_id, p.owner_id, owner)
  from public.practice_contacts pc
  join public.practices p on p.id = pc.practice_id
  join public.contacts c on c.id = pc.contact_id
  where pc.role = 'seller' and pc.is_primary and p.legacy_ref like 'DEMO-PRACTICE-%';

  -- 4. Buyer emails (the bulk of correspondence — details sent to interested buyers)
  insert into public.journal_entries (entry_type, subject, body, contact_id, practice_id, occurred_at, author_id)
  select 'email',
    'Confidential opportunity: ' || p.display_title,
    format('Dear %1$s,%3$sBased on your search criteria I thought of you for %2$s, which we have just brought to market. I''ve attached the confidential summary — do let me know if you''d like to arrange a viewing or discuss further.%3$sBest wishes,%3$sFrank Taylor & Associates',
           c.first_name, p.display_title, E'\n\n'),
    c.id, p.id, now() - (random()*70 || ' days')::interval, coalesce(p.owner_id, owner)
  from public.practice_contacts pc
  join public.practices p on p.id = pc.practice_id
  join public.contacts c on c.id = pc.contact_id
  where pc.role = 'buyer' and p.legacy_ref like 'DEMO-PRACTICE-%';

  -- 5. Buyer calls (about half of buyer links) with recorded outcomes
  insert into public.journal_entries (entry_type, body, contact_id, practice_id, occurred_at, author_id, call_direction, call_outcome_id)
  select 'call',
    format((array[
      'Called %1$s to gauge interest in %2$s. Positive — asked to see the last three years'' accounts.',
      'Spoke with %1$s about %2$s. Wants to arrange a viewing in the next fortnight; finance already in place.',
      'Left a voicemail for %1$s regarding %2$s and followed up by email.'
    ])[1 + (abs(hashtext(c.id::text || p.id::text)) % 3)], c.first_name, p.display_title),
    c.id, p.id, now() - (random()*60 || ' days')::interval, coalesce(p.owner_id, owner),
    'outbound', outcomes[1 + floor(random()*array_length(outcomes,1))::int]
  from public.practice_contacts pc
  join public.practices p on p.id = pc.practice_id
  join public.contacts c on c.id = pc.contact_id
  where pc.role = 'buyer' and p.legacy_ref like 'DEMO-PRACTICE-%'
    and abs(hashtext(c.id::text || p.id::text)) % 2 = 0;

  -- 6. Deal progression notes (linked to deal + practice)
  insert into public.journal_entries (entry_type, body, deal_id, practice_id, occurred_at, author_id)
  select 'note',
    (array[
      'Memorandum of sale issued to both solicitors. Buyer''s AML checks underway.',
      'Chased local authority searches — expected back within two weeks.',
      'Buyer''s bank valuation booked. CQC registration application in progress.',
      'Weekly update call held with both parties; all on track for target completion.'
    ])[1 + (s.n % 4)],
    d.id, d.practice_id, now() - (s.n * 9 || ' days')::interval, coalesce(d.owner_id, owner)
  from public.deals d
  join public.practices p on p.id = d.practice_id
  cross join lateral generate_series(1, 3) s(n)
  where p.legacy_ref like 'DEMO-PRACTICE-%';

  raise notice 'demo data loaded';
end $$;
