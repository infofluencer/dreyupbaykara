-- Google Ads extended metrics (Faz 2–3)

alter table public.ad_daily_stats
  add column if not exists ctr numeric(8, 6),
  add column if not exists average_cpc numeric(12, 2),
  add column if not exists cost_per_conversion numeric(12, 2),
  add column if not exists search_impression_share numeric(8, 6),
  add column if not exists search_budget_lost_impression_share numeric(8, 6),
  add column if not exists search_rank_lost_impression_share numeric(8, 6);

-- Cihaz, dönüşüm aksiyonu, coğrafya kırılımı
create table if not exists public.ad_segment_daily_stats (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  date date not null,
  segment_type text not null check (
    segment_type in ('device', 'conversion_action', 'geo')
  ),
  segment_value text not null,
  spend numeric(12, 2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now(),
  constraint ad_segment_daily_unique unique (
    campaign_id,
    date,
    segment_type,
    segment_value
  )
);

create index if not exists ad_segment_daily_lookup_idx
  on public.ad_segment_daily_stats (date desc, segment_type);

alter table public.ad_segment_daily_stats enable row level security;

create policy "ad_segment_daily_staff_select"
  on public.ad_segment_daily_stats for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));

-- Arama terimleri (search_term_view)
create table if not exists public.ad_search_term_daily (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  date date not null,
  search_term text not null,
  spend numeric(12, 2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now(),
  constraint ad_search_term_daily_unique unique (campaign_id, date, search_term)
);

create index if not exists ad_search_term_daily_date_idx
  on public.ad_search_term_daily (date desc);

alter table public.ad_search_term_daily enable row level security;

create policy "ad_search_term_daily_staff_select"
  on public.ad_search_term_daily for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));

-- Landing page performansı
create table if not exists public.ad_landing_page_daily (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  date date not null,
  landing_page text not null,
  spend numeric(12, 2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now(),
  constraint ad_landing_page_daily_unique unique (campaign_id, date, landing_page)
);

create index if not exists ad_landing_page_daily_date_idx
  on public.ad_landing_page_daily (date desc);

alter table public.ad_landing_page_daily enable row level security;

create policy "ad_landing_page_daily_staff_select"
  on public.ad_landing_page_daily for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));
