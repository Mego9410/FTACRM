-- FTA CRM — seed: lookup taxonomy, deal stages, permissions, system smart lists.
-- Idempotent: safe to re-run.

-- ── Lookup types ─────────────────────────────────────────────────────
insert into public.lookup_types (key, label, is_system) values
  ('specialism', 'Specialisms', true),
  ('funding_type', 'Funding types', true),
  ('tenure_type', 'Tenure types', true),
  ('trading_entity', 'Trading entities', true),
  ('contact_source', 'Contact sources', false),
  ('buyer_position', 'Buyer positions', false),
  ('buyer_status', 'Buyer statuses', false),
  ('offer_status', 'Offer statuses', true),
  ('event_type', 'Calendar event types', true),
  ('document_category', 'Document categories', false),
  ('task_category', 'Task categories', false),
  ('call_outcome', 'Call outcomes', false),
  ('withdrawal_reason', 'Withdrawal reasons', false),
  ('fall_through_reason', 'Fall-through reasons', false),
  ('valuation_kind', 'Valuation kinds', true),
  ('membership_tier', 'Membership tiers', false),
  ('principals_club_level', 'Principals Club levels', false),
  ('referral_type', 'Referral types', false)
on conflict (key) do nothing;

-- ── Lookup values ────────────────────────────────────────────────────
with t as (select id, key from public.lookup_types)
insert into public.lookup_values (lookup_type_id, value, sort_order, color, system_key)
select t.id, v.value, v.sort_order, v.color, v.system_key
from t
join (values
  ('specialism', 'General', 0, null, null),
  ('specialism', 'Endodontist', 1, null, null),
  ('specialism', 'Hygienist', 2, null, null),
  ('specialism', 'Implantologist', 3, null, null),
  ('specialism', 'Oral Surgeon', 4, null, null),
  ('specialism', 'Orthodontist', 5, null, null),
  ('specialism', 'Periodontist', 6, null, null),
  ('specialism', 'Prosthodontist', 7, null, null),
  ('specialism', 'Paediatric', 8, null, null),
  ('funding_type', 'NHS', 0, '#2F77BE', 'nhs'),
  ('funding_type', 'Private', 1, '#1F9D4D', 'private'),
  ('funding_type', 'Mixed', 2, '#A23B9E', 'mixed'),
  ('tenure_type', 'Freehold', 0, null, null),
  ('tenure_type', 'Leasehold', 1, null, null),
  ('tenure_type', 'Freehold or Leasehold', 2, null, null),
  ('tenure_type', 'Mixed', 3, null, null),
  ('trading_entity', 'Limited Company', 0, null, 'limited_company'),
  ('trading_entity', 'Sole Trader', 1, null, 'sole_trader'),
  ('trading_entity', 'Partnership', 2, null, 'partnership'),
  ('trading_entity', 'Expense Sharing', 3, null, 'expense_sharing'),
  ('contact_source', 'Website', 0, null, null),
  ('contact_source', 'Referral', 1, null, null),
  ('contact_source', 'Event', 2, null, null),
  ('contact_source', 'Cold call', 3, null, null),
  ('contact_source', 'Existing relationship', 4, null, null),
  ('contact_source', 'Other', 5, null, null),
  ('buyer_position', 'First-time buyer', 0, null, null),
  ('buyer_position', 'Existing owner', 1, null, null),
  ('buyer_position', 'Corporate / group', 2, null, null),
  ('buyer_position', 'Investor', 3, null, null),
  ('buyer_status', 'Active', 0, '#1F9D4D', 'active'),
  ('buyer_status', 'Passive', 1, null, null),
  ('buyer_status', 'Under offer', 2, '#B4862A', null),
  ('buyer_status', 'Completed', 3, null, null),
  ('buyer_status', 'Not proceeding', 4, null, null),
  ('event_type', 'Meeting', 0, '#2F77BE', 'meeting'),
  ('event_type', 'Valuation', 1, '#B4862A', 'valuation'),
  ('event_type', 'Viewing', 2, '#1F9D4D', 'viewing'),
  ('event_type', 'Call', 3, '#A23B9E', 'call'),
  ('event_type', 'Holiday', 4, '#8C8C88', 'holiday'),
  ('event_type', 'Webinar', 5, '#C4382D', null),
  ('event_type', 'Other', 6, '#5E5E5A', 'other'),
  ('document_category', 'Contract', 0, null, null),
  ('document_category', 'Accounts', 1, null, null),
  ('document_category', 'ID / AML', 2, null, null),
  ('document_category', 'Marketing', 3, null, null),
  ('document_category', 'Correspondence', 4, null, null),
  ('document_category', 'Other', 5, null, null),
  ('task_category', 'Follow up', 0, null, null),
  ('task_category', 'Chase', 1, null, null),
  ('task_category', 'Admin', 2, null, null),
  ('task_category', 'Compliance', 3, null, null),
  ('call_outcome', 'Connected', 0, null, 'connected'),
  ('call_outcome', 'Voicemail', 1, null, null),
  ('call_outcome', 'No answer', 2, null, null),
  ('call_outcome', 'Wrong number', 3, null, null),
  ('withdrawal_reason', 'Seller changed mind', 0, null, null),
  ('withdrawal_reason', 'Sold privately', 1, null, null),
  ('withdrawal_reason', 'Timing', 2, null, null),
  ('withdrawal_reason', 'Other', 3, null, null),
  ('fall_through_reason', 'Finance fell through', 0, null, null),
  ('fall_through_reason', 'Buyer withdrew', 1, null, null),
  ('fall_through_reason', 'Seller withdrew', 2, null, null),
  ('fall_through_reason', 'Legal issue', 3, null, null),
  ('fall_through_reason', 'CQC / regulatory', 4, null, null),
  ('fall_through_reason', 'Other', 5, null, null),
  ('valuation_kind', 'Valuation', 0, null, 'valuation'),
  ('valuation_kind', 'Desktop', 1, null, 'desktop'),
  ('valuation_kind', 'Update', 2, null, 'update'),
  ('membership_tier', 'Partner', 0, null, 'partner'),
  ('membership_tier', 'Affiliate', 1, null, 'affiliate'),
  ('membership_tier', 'Associate Plus', 2, null, 'associate_plus'),
  ('membership_tier', 'Associate', 3, null, 'associate'),
  ('principals_club_level', 'General', 0, null, 'general'),
  ('principals_club_level', 'Inner Circle', 1, null, 'inner_circle'),
  ('referral_type', 'EPCs', 0, null, 'epcs'),
  ('referral_type', 'Capital Allowances', 1, null, 'capital_allowances'),
  ('referral_type', 'Mortgages', 2, null, 'mortgages'),
  ('referral_type', 'CQC/Compliance', 3, null, 'cqc_compliance'),
  ('referral_type', 'Wills/LPAs', 4, null, 'wills_lpas'),
  ('referral_type', 'Insurances', 5, null, 'insurances'),
  ('referral_type', 'Pensions/Tax Planning/Investment', 6, null, 'pensions_tax_investment'),
  ('referral_type', 'Commercial Loans', 7, null, 'commercial_loans'),
  ('referral_type', 'Membership Upgrades', 8, null, 'membership_upgrades'),
  ('referral_type', 'Buxton & Coates', 9, null, 'buxton_coates'),
  ('referral_type', 'Howman Solicitors', 10, null, 'howman_solicitors'),
  ('referral_type', 'Shakespeare Martineau', 11, null, 'shakespeare_martineau'),
  ('referral_type', 'Acuity Law', 12, null, 'acuity_law'),
  ('referral_type', 'Berman', 13, null, 'berman'),
  ('referral_type', 'Other Sols', 14, null, 'other_sols'),
  ('referral_type', 'The Principals Club', 15, null, 'principals_club')
) as v(type_key, value, sort_order, color, system_key)
  on v.type_key = t.key
on conflict (lookup_type_id, value) do nothing;

-- ── Deal stages (the 7-step tracker) ─────────────────────────────────
insert into public.deal_stages (key, label, sort_order, is_terminal) values
  ('offer_accepted', 'Offer accepted', 1, false),
  ('solicitors_instructed', 'Solicitors instructed', 2, false),
  ('searches_ordered', 'Searches ordered', 3, false),
  ('finance_offer', 'Finance offer', 4, false),
  ('searches_back', 'Searches back', 5, false),
  ('contracts_exchanged', 'Contracts exchanged', 6, false),
  ('completion', 'Completion', 7, true)
on conflict (key) do nothing;

-- ── Role permissions ─────────────────────────────────────────────────
insert into public.role_permissions (role, permission) values
  ('admin', 'admin.access'), ('admin', 'admin.users'), ('admin', 'admin.lookups'),
  ('admin', 'admin.permissions'), ('admin', 'contacts.delete'), ('admin', 'contacts.erase'),
  ('admin', 'campaigns.send'), ('admin', 'deals.edit'), ('admin', 'reports.view'),
  ('admin', 'exports.full'),
  ('manager', 'campaigns.send'), ('manager', 'deals.edit'), ('manager', 'reports.view'),
  ('manager', 'contacts.delete'),
  ('agent', 'campaigns.send'), ('agent', 'deals.edit')
on conflict (role, permission) do nothing;

-- ── Default checklist templates ──────────────────────────────────────
insert into public.checklist_templates (name, applies_to)
select v.name, v.applies_to from (values
  ('Launch prep', 'practice'),
  ('Sales progression', 'deal'),
  ('New buyer onboarding', 'contact')
) as v(name, applies_to)
where not exists (select 1 from public.checklist_templates ct where ct.name = v.name);

insert into public.checklist_template_items (template_id, label, sort_order)
select ct.id, v.label, v.sort_order
from public.checklist_templates ct
join (values
  ('Launch prep', 'Add to list of practices', 0),
  ('Launch prep', 'Update reference', 1),
  ('Launch prep', 'Change status', 2),
  ('Launch prep', 'Change price', 3),
  ('Launch prep', 'Add number of surgeries', 4),
  ('Launch prep', 'Requirement check', 5),
  ('Launch prep', 'Create scans folder', 6),
  ('Launch prep', 'Create FP front page', 7),
  ('Launch prep', 'Create financial pack', 8),
  ('Launch prep', 'Check FP', 9),
  ('Launch prep', 'Save FP, SP and Overview in scans', 10),
  ('Launch prep', 'Save overview as JPEG in scans', 11),
  ('Launch prep', 'Save FAQs and Viewing form in scans', 12),
  ('Launch prep', 'Save docs to Openview (SP and FP)', 13),
  ('Launch prep', 'Add to action diary (Name – County, Ref)', 14),
  ('Launch prep', 'Create viewing confirmation email', 15),
  ('Launch prep', 'Add key features to Marketing', 16),
  ('Launch prep', 'Add to website as available and coming soon', 17),
  ('Launch prep', 'Add map image to media', 18),
  ('Launch prep', 'Edit SP/LP table', 19),
  ('Launch prep', 'Create Instagram post', 20),
  ('Launch prep', 'CQC registration note', 21),
  ('Launch prep', 'Check social media profiles', 22),
  ('Sales progression', 'Memorandum of sale sent', 0),
  ('Sales progression', 'Both solicitors instructed', 1),
  ('Sales progression', 'Buyer AML complete', 2),
  ('Sales progression', 'Finance application submitted', 3),
  ('Sales progression', 'CQC registration underway', 4),
  ('Sales progression', 'Completion statement agreed', 5),
  ('New buyer onboarding', 'Criteria captured', 0),
  ('New buyer onboarding', 'Proof of funds requested', 1),
  ('New buyer onboarding', 'GDPR preferences set', 2)
) as v(template_name, label, sort_order) on v.template_name = ct.name
where not exists (
  select 1 from public.checklist_template_items i
  where i.template_id = ct.id and i.label = v.label
);

-- ── System smart lists ───────────────────────────────────────────────
insert into public.saved_views (name, entity, definition, sort_order, show_on_dashboard)
select v.name, v.entity, v.definition::jsonb, v.sort_order, true from (values
  ('Agency contracts expiring', 'practices', '{"filter":"contract_expiring","days":60}', 0),
  ('Buyers not contacted 90 days', 'contacts', '{"filter":"buyers_stale","days":90}', 1),
  ('Sellers not contacted 30 days', 'contacts', '{"filter":"sellers_stale","days":30}', 2),
  ('Valuations awaiting outcome', 'practices', '{"filter":"valuations_pending"}', 3),
  ('Viewings needing feedback', 'practices', '{"filter":"viewings_feedback"}', 4),
  ('Unconfirmed upcoming viewings', 'practices', '{"filter":"viewings_unconfirmed"}', 5),
  ('Pending offers', 'practices', '{"filter":"offers_pending"}', 6),
  ('Stalled deals', 'deals', '{"filter":"deals_stalled","days":14}', 7),
  ('New buyers without criteria', 'contacts', '{"filter":"buyers_no_criteria"}', 8)
) as v(name, entity, definition, sort_order)
where not exists (
  select 1 from public.saved_views sv where sv.name = v.name and sv.owner_id is null
);
