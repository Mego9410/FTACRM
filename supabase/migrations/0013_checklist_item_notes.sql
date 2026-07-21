-- Checklist item notes ------------------------------------------------------
-- Free-text note per checklist item (matches the legacy per-item edit), shown
-- alongside the label. The "done on" date reuses checked_at.

alter table public.checklist_items add column if not exists note text;
