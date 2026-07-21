-- Launches ------------------------------------------------------------------
-- A launch is a specialised campaign: an auto-generated practice announcement
-- sent to the buyers the matching engine selects. Reuses the campaigns
-- pipeline (recipients, suppressions, unsubscribe, dispatch) via a kind tag.

alter table public.campaigns
  add column if not exists kind text not null default 'campaign'
  check (kind in ('campaign', 'launch'));

create index if not exists campaigns_kind_idx on public.campaigns (kind, created_at desc);
