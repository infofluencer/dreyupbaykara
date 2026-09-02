-- Google Ads click_view: gclid → kampanya eşleşmesi (CRM lead site ayrımı)

create table if not exists public.google_ad_clicks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.ad_accounts (id) on delete cascade,
  external_customer_id text not null,
  gclid text not null,
  external_campaign_id text not null,
  campaign_id uuid references public.ad_campaigns (id) on delete set null,
  click_date date not null,
  synced_at timestamptz not null default now(),
  constraint google_ad_clicks_gclid_unique unique (gclid)
);

create index if not exists google_ad_clicks_campaign_idx
  on public.google_ad_clicks (campaign_id)
  where campaign_id is not null;

create index if not exists google_ad_clicks_click_date_idx
  on public.google_ad_clicks (click_date desc);

create index if not exists google_ad_clicks_customer_idx
  on public.google_ad_clicks (external_customer_id);

alter table public.google_ad_clicks enable row level security;

create policy "google_ad_clicks_staff_select"
  on public.google_ad_clicks for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));

-- admin_marketing_summary: gclid → google_ad_clicks → kampanya.site

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
    select c.id, c.platform, c.site, c.name, c.external_campaign_id
    from public.ad_campaigns c
    where site_filter is null
       or c.site = site_filter
  ),
  landing_utm_slugs as (
    select distinct lower(
      coalesce(
        public.url_query_param(lp.landing_page, 'utm_campaign'),
        ''
      )
    ) as utm_slug
    from public.ad_landing_page_daily lp
    join filtered_campaigns fc on fc.id = lp.campaign_id
    where public.url_query_param(lp.landing_page, 'utm_campaign') is not null
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
  lead_attribution as (
    select
      l.id,
      l.created_at::date as lead_date,
      l.status,
      coalesce(nullif(btrim(l.site), ''), nullif(btrim(ls.site), '')) as site,
      coalesce(
        nullif(btrim(l.utm_campaign), ''),
        nullif(btrim(l.campaign), ''),
        nullif(btrim(ls.utm_campaign), ''),
        nullif(btrim(ls.campaign), ''),
        public.url_query_param(ls.landing_url, 'utm_campaign'),
        public.url_query_param(ls.landing_url, 'campaign')
      ) as effective_utm,
      coalesce(
        nullif(btrim(l.gclid), ''),
        nullif(btrim(ls.gclid), ''),
        public.url_query_param(ls.landing_url, 'gclid')
      ) as effective_gclid,
      coalesce(
        nullif(btrim(l.gbraid), ''),
        nullif(btrim(ls.gbraid), ''),
        public.url_query_param(ls.landing_url, 'gbraid')
      ) as effective_gbraid,
      coalesce(
        nullif(btrim(l.wbraid), ''),
        nullif(btrim(ls.wbraid), ''),
        public.url_query_param(ls.landing_url, 'wbraid')
      ) as effective_wbraid,
      coalesce(
        nullif(btrim(l.fbclid), ''),
        nullif(btrim(ls.fbclid), ''),
        public.url_query_param(ls.landing_url, 'fbclid')
      ) as effective_fbclid,
      coalesce(
        nullif(btrim(l.utm_source), ''),
        nullif(btrim(ls.utm_source), ''),
        public.url_query_param(ls.landing_url, 'utm_source')
      ) as effective_utm_source,
      ls.landing_url
    from public.leads l
    left join public.lead_sources ls on ls.lead_ref = l.lead_ref
    where l.created_at::date between start_date and end_date
  ),
  filtered_leads as (
    select
      la.id,
      la.lead_date,
      la.status,
      case
        when la.effective_gclid is not null
          or la.effective_gbraid is not null
          or la.effective_wbraid is not null
          then 'google_ads'
        when la.effective_fbclid is not null
          then 'meta'
        when lower(btrim(coalesce(la.effective_utm_source, ''))) in (
          'google', 'googleads', 'adwords', 'google_ads', 'youtube'
        ) then 'google_ads'
        when lower(btrim(coalesce(la.effective_utm_source, ''))) in (
          'facebook', 'fb', 'ig', 'instagram', 'meta', 'fbads', 'an'
        ) then 'meta'
        else 'other'
      end as platform
    from lead_attribution la
    where
      site_filter is null
      or la.site = site_filter
      or (
        site_filter in ('endospineistanbul', 'fitikameliyati')
        and (
          exists (
            select 1
            from public.ad_campaigns c
            where c.site = site_filter
              and la.effective_utm is not null
              and (
                lower(btrim(la.effective_utm)) = lower(c.name)
                or lower(btrim(la.effective_utm)) like '%' || lower(c.name) || '%'
                or lower(c.name) like '%' || lower(btrim(la.effective_utm)) || '%'
                or btrim(la.effective_utm) = c.external_campaign_id
                or exists (
                  select 1
                  from landing_utm_slugs lus
                  where lus.utm_slug = lower(btrim(la.effective_utm))
                )
              )
          )
          or (
            la.effective_gclid is not null
            and exists (
              select 1
              from public.google_ad_clicks gc
              join public.ad_campaigns c on c.id = gc.campaign_id
              where gc.gclid = la.effective_gclid
                and c.site = site_filter
            )
          )
          or (
            site_filter = 'endospineistanbul'
            and coalesce(la.landing_url, '') ilike '%endospineistanbul.com%'
          )
          or (
            site_filter = 'fitikameliyati'
            and coalesce(la.landing_url, '') ilike '%fitikameliyati.com%'
          )
        )
      )
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
