-- Marketing API Faz 1: ad accounts, campaign sync, daily stats, site prefix mapping.
-- Rollback: bölüm sonundaki DOWN yorumlarını uygulayın.

-- ---------------------------------------------------------------------------
-- site_prefix_map: kampanya ismi [PREFIX] → site kodu
-- ---------------------------------------------------------------------------
create table if not exists public.site_prefix_map (
  id uuid primary key default gen_random_uuid(),
  prefix text not null,
  site text not null,
  created_at timestamptz not null default now(),
  constraint site_prefix_map_prefix_unique unique (prefix)
);

create index if not exists site_prefix_map_site_idx
  on public.site_prefix_map (site);

insert into public.site_prefix_map (prefix, site)
values ('BEL', 'endoskopikbelameliyati')
on conflict (prefix) do nothing;

alter table public.site_prefix_map enable row level security;

create policy "site_prefix_map_staff_select"
  on public.site_prefix_map for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));

create policy "site_prefix_map_staff_update"
  on public.site_prefix_map for update to authenticated
  using (public.current_role() in ('admin', 'doctor', 'agency'))
  with check (public.current_role() in ('admin', 'doctor', 'agency'));

-- ---------------------------------------------------------------------------
-- ad_accounts: OAuth token'ları (service role yazar; staff token kolonlarını görmez)
-- TODO: üretimde Supabase Vault veya uygulama katmanı şifrelemesi ekleyin.
-- ---------------------------------------------------------------------------
create table if not exists public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('google_ads', 'meta')),
  external_account_id text not null,
  display_name text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_accounts_platform_external_unique unique (platform, external_account_id)
);

create index if not exists ad_accounts_platform_active_idx
  on public.ad_accounts (platform, is_active);

alter table public.ad_accounts enable row level security;

-- Staff yalnızca güvenli view üzerinden okur (token kolonları hariç).
create or replace view public.ad_accounts_safe
with (security_invoker = false, security_barrier = true)
as
select
  id,
  platform,
  external_account_id,
  display_name,
  token_expires_at,
  is_active,
  created_at,
  updated_at,
  (access_token is not null and length(trim(access_token)) > 0) as has_token
from public.ad_accounts;

revoke all on public.ad_accounts from public, anon, authenticated;
revoke all on public.ad_accounts_safe from public, anon;
grant select on public.ad_accounts_safe to authenticated;

-- ---------------------------------------------------------------------------
-- ad_campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.ad_accounts (id) on delete cascade,
  platform text not null check (platform in ('google_ads', 'meta')),
  external_campaign_id text not null,
  name text not null,
  site text,
  site_match_source text not null default 'unmatched'
    check (site_match_source in ('auto', 'manual', 'unmatched')),
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_campaigns_platform_external_unique unique (platform, external_campaign_id)
);

create index if not exists ad_campaigns_account_idx
  on public.ad_campaigns (account_id);

create index if not exists ad_campaigns_site_idx
  on public.ad_campaigns (site)
  where site is not null;

create index if not exists ad_campaigns_unmatched_idx
  on public.ad_campaigns (site_match_source)
  where site_match_source = 'unmatched';

alter table public.ad_campaigns enable row level security;

create policy "ad_campaigns_staff_select"
  on public.ad_campaigns for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));

create policy "ad_campaigns_staff_update"
  on public.ad_campaigns for update to authenticated
  using (public.current_role() in ('admin', 'doctor', 'agency'))
  with check (public.current_role() in ('admin', 'doctor', 'agency'));

-- ---------------------------------------------------------------------------
-- ad_daily_stats
-- ---------------------------------------------------------------------------
create table if not exists public.ad_daily_stats (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  date date not null,
  spend numeric(12, 2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric(12, 2) not null default 0,
  currency text not null default 'TRY',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_daily_stats_campaign_date_unique unique (campaign_id, date)
);

create index if not exists ad_daily_stats_date_desc_idx
  on public.ad_daily_stats (date desc);

create index if not exists ad_daily_stats_campaign_date_idx
  on public.ad_daily_stats (campaign_id, date);

alter table public.ad_daily_stats enable row level security;

create policy "ad_daily_stats_staff_select"
  on public.ad_daily_stats for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));

-- ---------------------------------------------------------------------------
-- conversion_events (Faz 3 — şema only)
-- ---------------------------------------------------------------------------
create table if not exists public.conversion_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  platform text not null check (platform in ('google_ads', 'meta')),
  click_id text,
  event_type text not null,
  value numeric(12, 2),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists conversion_events_lead_idx
  on public.conversion_events (lead_id);

create index if not exists conversion_events_status_idx
  on public.conversion_events (status)
  where status = 'pending';

alter table public.conversion_events enable row level security;

create policy "conversion_events_staff_select"
  on public.conversion_events for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));

-- ---------------------------------------------------------------------------
-- admin_marketing_summary(start_date, end_date, site_filter)
-- ---------------------------------------------------------------------------
create or replace function public.admin_marketing_summary(
  start_date date,
  end_date date,
  site_filter text default null
)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with filtered_campaigns as (
    select c.id, c.platform, c.site, c.name
    from public.ad_campaigns c
    where site_filter is null
       or c.site = site_filter
  ),
  spend_by_day as (
    select
      s.date,
      sum(s.spend)::numeric(12, 2) as spend,
      sum(s.spend) filter (where fc.platform = 'google_ads')::numeric(12, 2) as google_spend,
      sum(s.spend) filter (where fc.platform = 'meta')::numeric(12, 2) as meta_spend
    from public.ad_daily_stats s
    join filtered_campaigns fc on fc.id = s.campaign_id
    where s.date between start_date and end_date
    group by s.date
  ),
  spend_totals as (
    select
      coalesce(sum(spend), 0)::numeric(12, 2) as total_spend,
      coalesce(sum(google_spend), 0)::numeric(12, 2) as google_spend,
      coalesce(sum(meta_spend), 0)::numeric(12, 2) as meta_spend
    from spend_by_day
  ),
  filtered_leads as (
    select
      l.id,
      l.created_at::date as lead_date,
      l.status,
      case
        when nullif(btrim(coalesce(l.gclid, '')), '') is not null
          or nullif(btrim(coalesce(l.gbraid, '')), '') is not null
          or nullif(btrim(coalesce(l.wbraid, '')), '') is not null
          then 'google_ads'
        when nullif(btrim(coalesce(l.fbclid, '')), '') is not null
          or nullif(btrim(coalesce(l.ctwa_clid, '')), '') is not null
          then 'meta'
        when lower(btrim(coalesce(l.utm_source, ''))) in (
          'google', 'googleads', 'adwords', 'google_ads', 'youtube'
        ) then 'google_ads'
        when lower(btrim(coalesce(l.utm_source, ''))) in (
          'facebook', 'fb', 'ig', 'instagram', 'meta', 'fbads', 'an'
        ) then 'meta'
        else 'other'
      end as platform
    from public.leads l
    where l.created_at::date between start_date and end_date
      and (site_filter is null or l.site = site_filter)
  ),
  lead_totals as (
    select
      count(*)::int as total_leads,
      count(*) filter (where status in ('randevulu', 'bitti'))::int as appointment_leads,
      count(*) filter (where platform = 'google_ads')::int as google_leads,
      count(*) filter (where platform = 'meta')::int as meta_leads
    from filtered_leads
  ),
  leads_by_day as (
    select lead_date as date, count(*)::int as leads
    from filtered_leads
    group by lead_date
  ),
  daily_series as (
    select
      d.date,
      coalesce(s.spend, 0)::numeric(12, 2) as spend,
      coalesce(l.leads, 0)::int as leads
    from (
      select generate_series(start_date, end_date, interval '1 day')::date as date
    ) d
    left join spend_by_day s on s.date = d.date
    left join leads_by_day l on l.date = d.date
    order by d.date
  )
  select json_build_object(
    'total_spend', st.total_spend,
    'total_leads', lt.total_leads,
    'cpl', case
      when lt.total_leads > 0
        then round(st.total_spend / lt.total_leads, 2)
      else null
    end,
    'appointment_rate', case
      when lt.total_leads > 0
        then round(lt.appointment_leads::numeric / lt.total_leads, 4)
      else null
    end,
    'appointment_leads', lt.appointment_leads,
    'currency', 'TRY',
    'platforms', json_build_object(
      'google_ads', json_build_object(
        'spend', st.google_spend,
        'leads', lt.google_leads,
        'cpl', case
          when lt.google_leads > 0
            then round(st.google_spend / lt.google_leads, 2)
          else null
        end
      ),
      'meta', json_build_object(
        'spend', st.meta_spend,
        'leads', lt.meta_leads,
        'cpl', case
          when lt.meta_leads > 0
            then round(st.meta_spend / lt.meta_leads, 2)
          else null
        end
      )
    ),
    'daily', coalesce(
      (select json_agg(
        json_build_object(
          'date', ds.date,
          'spend', ds.spend,
          'leads', ds.leads
        )
        order by ds.date
      ) from daily_series ds),
      '[]'::json
    )
  )
  from spend_totals st
  cross join lead_totals lt;
$$;

revoke all on function public.admin_marketing_summary(date, date, text) from public, anon;
grant execute on function public.admin_marketing_summary(date, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- DOWN (rollback)
-- ---------------------------------------------------------------------------
-- drop function if exists public.admin_marketing_summary(date, date, text);
-- drop policy if exists "conversion_events_staff_select" on public.conversion_events;
-- drop table if exists public.conversion_events;
-- drop policy if exists "ad_daily_stats_staff_select" on public.ad_daily_stats;
-- drop table if exists public.ad_daily_stats;
-- drop policy if exists "ad_campaigns_staff_update" on public.ad_campaigns;
-- drop policy if exists "ad_campaigns_staff_select" on public.ad_campaigns;
-- drop table if exists public.ad_campaigns;
-- drop view if exists public.ad_accounts_safe;
-- drop table if exists public.ad_accounts;
-- drop policy if exists "site_prefix_map_staff_update" on public.site_prefix_map;
-- drop policy if exists "site_prefix_map_staff_select" on public.site_prefix_map;
-- drop table if exists public.site_prefix_map;
