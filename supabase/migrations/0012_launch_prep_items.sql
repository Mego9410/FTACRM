-- Launch prep checklist -----------------------------------------------------
-- Replace the Launch prep (practice) template items with the full launch
-- process, so a new practice launches with its complete task list. Existing
-- checklist instances are copies and are left untouched — only newly created
-- practices pick up the fuller list.

insert into public.checklist_templates (name, applies_to)
select 'Launch prep', 'practice'
where not exists (
  select 1 from public.checklist_templates
  where name = 'Launch prep' and applies_to = 'practice'
);

delete from public.checklist_template_items i
using public.checklist_templates t
where i.template_id = t.id and t.name = 'Launch prep' and t.applies_to = 'practice';

insert into public.checklist_template_items (template_id, label, sort_order)
select t.id, v.label, v.sort_order
from public.checklist_templates t
join (values
  ('Add to list of practices', 0),
  ('Update reference', 1),
  ('Change status', 2),
  ('Change price', 3),
  ('Add number of surgeries', 4),
  ('Requirement check', 5),
  ('Create scans folder', 6),
  ('Create FP front page', 7),
  ('Create financial pack', 8),
  ('Check FP', 9),
  ('Save FP, SP and Overview in scans', 10),
  ('Save overview as JPEG in scans', 11),
  ('Save FAQs and Viewing form in scans', 12),
  ('Save docs to Openview (SP and FP)', 13),
  ('Add to action diary (Name – County, Ref)', 14),
  ('Create viewing confirmation email', 15),
  ('Add key features to Marketing', 16),
  ('Add to website as available and coming soon', 17),
  ('Add map image to media', 18),
  ('Edit SP/LP table', 19),
  ('Create Instagram post', 20),
  ('CQC registration note', 21),
  ('Check social media profiles', 22)
) as v(label, sort_order) on true
where t.name = 'Launch prep' and t.applies_to = 'practice';
