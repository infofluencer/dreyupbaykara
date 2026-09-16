-- Durum panosu arşivi: hasta kolonunu (status) değiştirmeden panodan düşer.
-- Arşiv görünümü aynı 6 kolonu gösterir; yalnızca archived_at dolu kayıtlar gelir.

alter table public.leads
  add column if not exists archived_at timestamptz;

comment on column public.leads.archived_at is
  'Durum panosu arşivi. NULL = aktif pano, dolu = arşiv görünümü. status korunur.';

create index if not exists leads_pipeline_active_created_idx
  on public.leads (created_at desc)
  where archived_at is null;

create index if not exists leads_pipeline_archived_created_idx
  on public.leads (created_at desc)
  where archived_at is not null;
