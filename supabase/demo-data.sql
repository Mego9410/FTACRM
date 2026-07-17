-- LOCAL DEV DEMO DATA — safe to load into a local Supabase for exploring the app.
--
-- Adds dummy practices, buyers, sellers, solicitors, offers, deals at various sales-
-- progression stages, and correspondence (calls / notes / emails) between the parties so the
-- end-to-end flow is visible. Idempotent: every row uses a fixed UUID and
-- `on conflict (id) do nothing`, so re-running is a no-op. All demo rows carry
-- legacy_ref = 'DEMO' so they are easy to find or delete:
--     delete from public.journal_entries where legacy_ref = 'DEMO';  -- (add column? no — see below)
-- Practices / contacts / deals are tagged via their legacy_ref column; journal/offer/link rows
-- cascade-delete with their parents.
--
-- Ownership/authorship is attributed to the first profile (the admin created during setup), so
-- load this AFTER creating the admin user. If no profile exists the block exits without change.
-- Not wired into config.toml seeding — load it explicitly:
--     docker exec -i supabase_db_workspace psql -U postgres -d postgres < supabase/demo-data.sql

do $$
declare
  v_owner uuid;
begin
  select id into v_owner from public.profiles order by created_at limit 1;
  if v_owner is null then
    raise notice 'No profile found — create the admin user first. Skipping demo data.';
    return;
  end if;

  ---------------------------------------------------------------------------- contacts: buyers
  insert into public.contacts (id, kind, first_name, last_name, email, mobile, roles, status,
      temperature, town, county, consent_email, consent_phone, legacy_ref, owner_id, created_by)
  values
    ('b0000000-0000-0000-0000-000000000001','person','Priya','Sharma','priya.sharma@example.com','07700 900101',array['buyer'],'active','hot','Guildford','Surrey',true,true,'DEMO',v_owner,v_owner),
    ('b0000000-0000-0000-0000-000000000002','person','Daniel','O''Connor','daniel.oconnor@example.com','07700 900102',array['buyer'],'active','warm','Reading','Berkshire',true,true,'DEMO',v_owner,v_owner),
    ('b0000000-0000-0000-0000-000000000003','person','Aisha','Khan','aisha.khan@example.com','07700 900103',array['buyer'],'active','hot','Watford','Hertfordshire',true,true,'DEMO',v_owner,v_owner),
    ('b0000000-0000-0000-0000-000000000004','person','Tom','Bennett','tom.bennett@example.com','07700 900104',array['buyer'],'active','warm','Bristol','Bristol',true,true,'DEMO',v_owner,v_owner),
    ('b0000000-0000-0000-0000-000000000005','person','Sofia','Rossi','sofia.rossi@example.com','07700 900105',array['buyer'],'active','hot','Oxford','Oxfordshire',true,true,'DEMO',v_owner,v_owner),
    ('b0000000-0000-0000-0000-000000000006','person','James','Whitfield','james.whitfield@example.com','07700 900106',array['buyer'],'active','cold','Cambridge','Cambridgeshire',true,false,'DEMO',v_owner,v_owner),
    ('b0000000-0000-0000-0000-000000000007','person','Hannah','Lewis','hannah.lewis@example.com','07700 900107',array['buyer'],'active','warm','Leeds','West Yorkshire',true,true,'DEMO',v_owner,v_owner),
    ('b0000000-0000-0000-0000-000000000008','person','Marcus','Chen','marcus.chen@example.com','07700 900108',array['buyer'],'active','hot','Manchester','Greater Manchester',true,true,'DEMO',v_owner,v_owner)
  on conflict (id) do nothing;

  --------------------------------------------------------------------------- contacts: sellers
  insert into public.contacts (id, kind, first_name, last_name, company_name, email, mobile, roles,
      temperature, town, county, consent_email, consent_phone, legacy_ref, owner_id, created_by)
  values
    ('5e000000-0000-0000-0000-000000000001','person','Robert','Hale','Hale Dental Practice','robert.hale@example.com','07700 900201',array['seller'],'warm','Guildford','Surrey',true,true,'DEMO',v_owner,v_owner),
    ('5e000000-0000-0000-0000-000000000002','person','Margaret','Doyle','Doyle & Partners Dental','margaret.doyle@example.com','07700 900202',array['seller'],'hot','Reading','Berkshire',true,true,'DEMO',v_owner,v_owner),
    ('5e000000-0000-0000-0000-000000000003','person','Geoffrey','Palmer','Palmer Family Dentistry','geoffrey.palmer@example.com','07700 900203',array['seller'],'warm','Watford','Hertfordshire',true,true,'DEMO',v_owner,v_owner),
    ('5e000000-0000-0000-0000-000000000004','person','Susan','Reid','Reid Orthodontics','susan.reid@example.com','07700 900204',array['seller'],'warm','Bath','Somerset',true,true,'DEMO',v_owner,v_owner),
    ('5e000000-0000-0000-0000-000000000005','person','Alan','Forsythe','Forsythe Dental Care','alan.forsythe@example.com','07700 900205',array['seller'],'cold','Oxford','Oxfordshire',true,false,'DEMO',v_owner,v_owner),
    ('5e000000-0000-0000-0000-000000000006','person','Nadia','Petrova','Petrova Smile Studio','nadia.petrova@example.com','07700 900206',array['seller'],'warm','Cambridge','Cambridgeshire',true,true,'DEMO',v_owner,v_owner),
    ('5e000000-0000-0000-0000-000000000007','person','David','Osei','Osei Dental Group','david.osei@example.com','07700 900207',array['seller'],'hot','Leeds','West Yorkshire',true,true,'DEMO',v_owner,v_owner)
  on conflict (id) do nothing;

  ----------------------------------------------------------------------- contacts: solicitors
  insert into public.contacts (id, kind, first_name, last_name, company_name, email, work_phone,
      roles, town, county, legacy_ref, owner_id, created_by)
  values
    ('11c00000-0000-0000-0000-000000000001','person','Catherine','Bell','Bell & Whitmore LLP','catherine.bell@bellwhitmore.example','020 7946 1001',array['solicitor'],'London','Greater London','DEMO',v_owner,v_owner),
    ('11c00000-0000-0000-0000-000000000002','person','Michael','Ford','Ford Healthcare Legal','michael.ford@fordhealthlaw.example','0161 496 1002',array['solicitor'],'Manchester','Greater Manchester','DEMO',v_owner,v_owner),
    ('11c00000-0000-0000-0000-000000000003','person','Rachel','Green','Greenfield Solicitors','rachel.green@greenfield.example','0117 496 1003',array['solicitor'],'Bristol','Bristol','DEMO',v_owner,v_owner)
  on conflict (id) do nothing;

  ------------------------------------------------------------------------------------ practices
  insert into public.practices (id, name, display_title, town, county, postcode, status,
      asking_price, price_prefix, surgeries, annual_turnover, description, confidential,
      instructed_at, legacy_ref, owner_id, created_by)
  values
    ('aa000000-0000-0000-0000-000000000001','Hale Dental Practice','4-surgery mixed practice in Guildford','Guildford','Surrey','GU1 3AB','available',850000,'guide',4,720000,'Well-established mixed NHS/private practice with strong hygiene income.',true,current_date - 40,'DEMO',v_owner,v_owner),
    ('aa000000-0000-0000-0000-000000000002','Doyle & Partners Dental','6-surgery private practice near Reading','Reading','Berkshire','RG1 5TT','under_offer',1250000,'offers_over',6,1180000,'Fully private, high-spec practice with digital workflow throughout.',true,current_date - 90,'DEMO',v_owner,v_owner),
    ('aa000000-0000-0000-0000-000000000003','Palmer Family Dentistry','3-surgery NHS practice in Watford','Watford','Hertfordshire','WD17 1AA','under_offer',640000,'guide',3,510000,'Long-standing NHS practice with a loyal patient base and stable UDA contract.',true,current_date - 120,'DEMO',v_owner,v_owner),
    ('aa000000-0000-0000-0000-000000000004','Reid Orthodontics','Specialist orthodontic practice, Bath','Bath','Somerset','BA1 2QP','completed',990000,'fixed',3,860000,'Referral-led specialist orthodontic practice with consultant goodwill.',true,current_date - 220,'DEMO',v_owner,v_owner),
    ('aa000000-0000-0000-0000-000000000005','Forsythe Dental Care','2-surgery practice, Oxford (valuation)','Oxford','Oxfordshire','OX1 2JD','valuation',null,'poa',2,380000,'Owner considering retirement sale; valuation stage.',true,current_date - 10,'DEMO',v_owner,v_owner),
    ('aa000000-0000-0000-0000-000000000006','Petrova Smile Studio','Boutique cosmetic practice, Cambridge','Cambridge','Cambridgeshire','CB1 1PT','available',470000,'guide',2,395000,'Boutique cosmetic and facial-aesthetics practice, fully private.',true,current_date - 30,'DEMO',v_owner,v_owner),
    ('aa000000-0000-0000-0000-000000000007','Osei Dental Group','8-surgery group practice, Leeds','Leeds','West Yorkshire','LS1 4DY','under_offer',1500000,'offers_over',8,1640000,'Large group practice with associate-led model and expansion potential.',true,current_date - 150,'DEMO',v_owner,v_owner)
  on conflict (id) do nothing;

  ----------------------------------------------------------- practice_contacts (sellers/buyers)
  insert into public.practice_contacts (id, practice_id, contact_id, role, is_primary) values
    ('9c000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','5e000000-0000-0000-0000-000000000001','seller',true),
    ('9c000000-0000-0000-0000-000000000002','aa000000-0000-0000-0000-000000000002','5e000000-0000-0000-0000-000000000002','seller',true),
    ('9c000000-0000-0000-0000-000000000003','aa000000-0000-0000-0000-000000000003','5e000000-0000-0000-0000-000000000003','seller',true),
    ('9c000000-0000-0000-0000-000000000004','aa000000-0000-0000-0000-000000000004','5e000000-0000-0000-0000-000000000004','seller',true),
    ('9c000000-0000-0000-0000-000000000005','aa000000-0000-0000-0000-000000000005','5e000000-0000-0000-0000-000000000005','seller',true),
    ('9c000000-0000-0000-0000-000000000006','aa000000-0000-0000-0000-000000000006','5e000000-0000-0000-0000-000000000006','seller',true),
    ('9c000000-0000-0000-0000-000000000007','aa000000-0000-0000-0000-000000000007','5e000000-0000-0000-0000-000000000007','seller',true),
    -- buyers linked on the practices that are under offer / completed
    ('9c000000-0000-0000-0000-000000000012','aa000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000003','buyer',true),
    ('9c000000-0000-0000-0000-000000000013','aa000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000004','buyer',true),
    ('9c000000-0000-0000-0000-000000000014','aa000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000005','buyer',true),
    ('9c000000-0000-0000-0000-000000000017','aa000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000007','buyer',true),
    -- solicitors on the live deals
    ('9c000000-0000-0000-0000-000000000022','aa000000-0000-0000-0000-000000000002','11c00000-0000-0000-0000-000000000001','buyer_solicitor',false),
    ('9c000000-0000-0000-0000-000000000023','aa000000-0000-0000-0000-000000000002','11c00000-0000-0000-0000-000000000002','seller_solicitor',false),
    ('9c000000-0000-0000-0000-000000000024','aa000000-0000-0000-0000-000000000003','11c00000-0000-0000-0000-000000000003','buyer_solicitor',false),
    ('9c000000-0000-0000-0000-000000000027','aa000000-0000-0000-0000-000000000007','11c00000-0000-0000-0000-000000000001','buyer_solicitor',false)
  on conflict (id) do nothing;

  ---------------------------------------------------------------------------------------- offers
  insert into public.offers (id, practice_id, buyer_contact_id, amount, status, offer_date,
      finance_status, accepted_at, created_by) values
    ('0ffe0000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',850000,'pending',current_date - 5,'mortgage_needed',null,v_owner),
    ('0ffe0000-0000-0000-0000-000000000002','aa000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',820000,'pending',current_date - 3,'cash',null,v_owner),
    ('0ffe0000-0000-0000-0000-000000000003','aa000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000003',1250000,'accepted',current_date - 45,'mortgage_agreed',now() - interval '45 days',v_owner),
    ('0ffe0000-0000-0000-0000-000000000004','aa000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000004',640000,'accepted',current_date - 85,'cash',now() - interval '85 days',v_owner),
    ('0ffe0000-0000-0000-0000-000000000005','aa000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000005',990000,'accepted',current_date - 210,'mortgage_agreed',now() - interval '210 days',v_owner),
    ('0ffe0000-0000-0000-0000-000000000006','aa000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000006',470000,'pending',current_date - 4,'mortgage_needed',null,v_owner),
    ('0ffe0000-0000-0000-0000-000000000007','aa000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000007',1500000,'accepted',current_date - 70,'mortgage_agreed',now() - interval '70 days',v_owner)
  on conflict (id) do nothing;

  ----------------------------------------------------------------------------------------- deals
  -- D1: Doyle & Partners — in progress, current stage = Searches ordered (stages 1-2 done)
  insert into public.deals (id, practice_id, offer_id, buyer_contact_id, seller_contact_id,
      buyer_solicitor_id, seller_solicitor_id, agreed_price, status, current_stage_id,
      target_completion_date, owner_id, legacy_ref) values
    ('dea10000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000002','0ffe0000-0000-0000-0000-000000000003',
      'b0000000-0000-0000-0000-000000000003','5e000000-0000-0000-0000-000000000002',
      '11c00000-0000-0000-0000-000000000001','11c00000-0000-0000-0000-000000000002',1250000,'in_progress',
      (select id from public.deal_stages where key='searches_ordered'),current_date + 45,v_owner,'DEMO'),
  -- D2: Palmer Family — in progress, current stage = Searches back (stages 1-4 done)
    ('dea10000-0000-0000-0000-000000000002','aa000000-0000-0000-0000-000000000003','0ffe0000-0000-0000-0000-000000000004',
      'b0000000-0000-0000-0000-000000000004','5e000000-0000-0000-0000-000000000003',
      '11c00000-0000-0000-0000-000000000003','11c00000-0000-0000-0000-000000000002',640000,'in_progress',
      (select id from public.deal_stages where key='searches_back'),current_date + 20,v_owner,'DEMO'),
  -- D3: Reid Orthodontics — completed (all 7 stages done)
    ('dea10000-0000-0000-0000-000000000003','aa000000-0000-0000-0000-000000000004','0ffe0000-0000-0000-0000-000000000005',
      'b0000000-0000-0000-0000-000000000005','5e000000-0000-0000-0000-000000000004',
      '11c00000-0000-0000-0000-000000000001','11c00000-0000-0000-0000-000000000003',990000,'completed',
      (select id from public.deal_stages where key='completion'),current_date - 20,v_owner,'DEMO'),
  -- D4: Osei Dental Group — on hold, current stage = Searches ordered (stages 1-2 done)
    ('dea10000-0000-0000-0000-000000000004','aa000000-0000-0000-0000-000000000007','0ffe0000-0000-0000-0000-000000000007',
      'b0000000-0000-0000-0000-000000000007','5e000000-0000-0000-0000-000000000007',
      '11c00000-0000-0000-0000-000000000001',null,1500000,'on_hold',
      (select id from public.deal_stages where key='searches_ordered'),current_date + 60,v_owner,'DEMO')
  on conflict (id) do nothing;

  update public.deals set completed_at = current_date - 20 where id = 'dea10000-0000-0000-0000-000000000003';

  ---------------------------------------------------------------------------- deal_stage_events
  insert into public.deal_stage_events (deal_id, stage_id, achieved_on, recorded_by, note)
  select d.deal_id::uuid, s.id, d.achieved_on, v_owner, d.note
  from (values
    -- D1: stages 1-2
    ('dea10000-0000-0000-0000-000000000001','offer_accepted', current_date - 45, 'Offer of £1.25m accepted by the seller.'),
    ('dea10000-0000-0000-0000-000000000001','solicitors_instructed', current_date - 38, 'Both sides instructed; memorandum of sale issued.'),
    -- D2: stages 1-4
    ('dea10000-0000-0000-0000-000000000002','offer_accepted', current_date - 85, 'Cash offer accepted.'),
    ('dea10000-0000-0000-0000-000000000002','solicitors_instructed', current_date - 80, null),
    ('dea10000-0000-0000-0000-000000000002','searches_ordered', current_date - 62, 'Local authority searches ordered.'),
    ('dea10000-0000-0000-0000-000000000002','finance_offer', current_date - 40, 'Buyer confirmed cash — no finance required.'),
    -- D3: all 7 (completed)
    ('dea10000-0000-0000-0000-000000000003','offer_accepted', current_date - 210, null),
    ('dea10000-0000-0000-0000-000000000003','solicitors_instructed', current_date - 200, null),
    ('dea10000-0000-0000-0000-000000000003','searches_ordered', current_date - 180, null),
    ('dea10000-0000-0000-0000-000000000003','finance_offer', current_date - 150, 'Mortgage offer received.'),
    ('dea10000-0000-0000-0000-000000000003','searches_back', current_date - 90, null),
    ('dea10000-0000-0000-0000-000000000003','contracts_exchanged', current_date - 40, 'Contracts exchanged, completion set.'),
    ('dea10000-0000-0000-0000-000000000003','completion', current_date - 20, 'Completed — funds transferred, keys released.'),
    -- D4: stages 1-2 (on hold)
    ('dea10000-0000-0000-0000-000000000004','offer_accepted', current_date - 70, null),
    ('dea10000-0000-0000-0000-000000000004','solicitors_instructed', current_date - 60, 'On hold pending CQC registration transfer.')
  ) as d(deal_id, stage_key, achieved_on, note)
  join public.deal_stages s on s.key = d.stage_key
  on conflict (deal_id, stage_id) do nothing;

  --------------------------------------------------------------------- journal / correspondence
  insert into public.journal_entries (id, entry_type, subject, body, author_id, contact_id,
      practice_id, deal_id, call_direction, occurred_at) values
    -- Practice 1 (available) — buyer interest + viewings
    ('30000000-0000-0000-0000-000000000001','note','Instruction signed','Seller signed sole-agency instruction at guide £850k.',v_owner,null,'aa000000-0000-0000-0000-000000000001',null,null,now() - interval '39 days'),
    ('30000000-0000-0000-0000-000000000002','call','Buyer enquiry — Priya Sharma','Priya called about the Guildford practice; keen on the hygiene income. Sent details.',v_owner,'b0000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001',null,'inbound',now() - interval '12 days'),
    ('30000000-0000-0000-0000-000000000003','email','Details pack sent','Emailed sales memorandum and financials to Priya Sharma.',v_owner,'b0000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001',null,null,now() - interval '11 days'),
    ('30000000-0000-0000-0000-000000000004','call','Offer discussion — Daniel O''Connor','Daniel indicated a cash offer around £820k. Advised to submit formally.',v_owner,'b0000000-0000-0000-0000-000000000002','aa000000-0000-0000-0000-000000000001',null,'outbound',now() - interval '4 days'),
    ('30000000-0000-0000-0000-000000000005','note','Two offers received','Competing offers from Priya Sharma (£850k) and Daniel O''Connor (£820k). Seller reviewing.',v_owner,null,'aa000000-0000-0000-0000-000000000001',null,null,now() - interval '2 days'),

    -- Practice 2 / Deal 1 (Doyle & Partners) — full correspondence flow
    ('30000000-0000-0000-0000-000000000011','call','Viewing feedback — Aisha Khan','Aisha loved the digital setup. Confident she''ll offer at asking.',v_owner,'b0000000-0000-0000-0000-000000000003','aa000000-0000-0000-0000-000000000002',null,'inbound',now() - interval '50 days'),
    ('30000000-0000-0000-0000-000000000012','email','Offer accepted — next steps','Confirmed acceptance of £1.25m to Aisha and requested solicitor details.',v_owner,'b0000000-0000-0000-0000-000000000003',null,'dea10000-0000-0000-0000-000000000001',null,now() - interval '45 days'),
    ('30000000-0000-0000-0000-000000000013','note','Seller update — Margaret Doyle','Called Margaret to confirm sale agreed; delighted. Reassured on staff TUPE.',v_owner,'5e000000-0000-0000-0000-000000000002',null,'dea10000-0000-0000-0000-000000000001',null,now() - interval '44 days'),
    ('30000000-0000-0000-0000-000000000014','email','Memorandum of sale circulated','Sent memo of sale to Bell & Whitmore (buyer) and Ford Healthcare Legal (seller).',v_owner,null,null,'dea10000-0000-0000-0000-000000000001',null,now() - interval '38 days'),
    ('30000000-0000-0000-0000-000000000015','call','Chasing searches','Called buyer solicitor to confirm local searches will be ordered this week.',v_owner,'11c00000-0000-0000-0000-000000000001',null,'dea10000-0000-0000-0000-000000000001','outbound',now() - interval '6 days'),

    -- Practice 3 / Deal 2 (Palmer Family) — further along
    ('30000000-0000-0000-0000-000000000021','note','Cash buyer secured','Tom Bennett offered £640k cash. Seller accepted same day.',v_owner,'b0000000-0000-0000-0000-000000000004','aa000000-0000-0000-0000-000000000003',null,null,now() - interval '85 days'),
    ('30000000-0000-0000-0000-000000000022','email','Searches back','Greenfield Solicitors confirmed searches returned clear.',v_owner,null,null,'dea10000-0000-0000-0000-000000000002',null,now() - interval '10 days'),
    ('30000000-0000-0000-0000-000000000023','call','Completion timeline — Geoffrey Palmer','Discussed target completion with the seller; comfortable with 3 weeks.',v_owner,'5e000000-0000-0000-0000-000000000003',null,'dea10000-0000-0000-0000-000000000002','outbound',now() - interval '8 days'),

    -- Practice 4 / Deal 3 (Reid Orthodontics) — completed
    ('30000000-0000-0000-0000-000000000031','email','Completion confirmed','Funds transferred and keys released to Sofia Rossi. Deal complete.',v_owner,'b0000000-0000-0000-0000-000000000005',null,'dea10000-0000-0000-0000-000000000003',null,now() - interval '20 days'),
    ('30000000-0000-0000-0000-000000000032','note','Post-completion thank-you','Susan Reid sent thanks; happy with the handover. Requested we stay in touch.',v_owner,'5e000000-0000-0000-0000-000000000004','aa000000-0000-0000-0000-000000000004',null,null,now() - interval '18 days'),

    -- Practice 5 (valuation stage)
    ('30000000-0000-0000-0000-000000000041','call','Valuation booked — Alan Forsythe','Alan considering retirement. Booked valuation visit for next week.',v_owner,'5e000000-0000-0000-0000-000000000005','aa000000-0000-0000-0000-000000000005',null,'inbound',now() - interval '9 days'),

    -- Practice 6 (available, cosmetic)
    ('30000000-0000-0000-0000-000000000051','email','Brochure sent — James Whitfield','Sent the Cambridge cosmetic practice brochure to James.',v_owner,'b0000000-0000-0000-0000-000000000006','aa000000-0000-0000-0000-000000000006',null,null,now() - interval '3 days'),
    ('30000000-0000-0000-0000-000000000052','note','Owner keen for confidential sale','Nadia Petrova stressed confidentiality; staff not yet aware.',v_owner,'5e000000-0000-0000-0000-000000000006','aa000000-0000-0000-0000-000000000006',null,null,now() - interval '20 days'),

    -- Practice 7 / Deal 4 (Osei, on hold)
    ('30000000-0000-0000-0000-000000000061','call','On hold — CQC registration','Marcus Chen''s CQC registration delayed. Deal paused; will review fortnightly.',v_owner,'b0000000-0000-0000-0000-000000000007',null,'dea10000-0000-0000-0000-000000000004','outbound',now() - interval '15 days'),
    ('30000000-0000-0000-0000-000000000062','note','Seller reassured — David Osei','Explained the hold to David; comfortable to wait for the right completion.',v_owner,'5e000000-0000-0000-0000-000000000007',null,'dea10000-0000-0000-0000-000000000004',null,now() - interval '14 days'),

    -- A few standalone buyer touches
    ('30000000-0000-0000-0000-000000000071','call','Registration call — Hannah Lewis','Hannah registered as a buyer looking for NHS practices in Yorkshire.',v_owner,'b0000000-0000-0000-0000-000000000007',null,null,'inbound',now() - interval '25 days'),
    ('30000000-0000-0000-0000-000000000072','email','Welcome + criteria','Sent welcome email and buyer criteria form to Marcus Chen.',v_owner,'b0000000-0000-0000-0000-000000000008',null,null,null,now() - interval '22 days')
  on conflict (id) do nothing;

  raise notice 'Demo data loaded (owner/author = %).', v_owner;
end $$;
