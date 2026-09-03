-- Kampanya performans: günlük satırları JS'e çekmek yerine DB'de topla
-- (720 gün × 100 kampanya ≈ 70k satır → ~100 satır)

create or replace function public.admin_campaign_stats_agg(
  p_campaign_ids uuid[],
  p_start date,
  p_end date
)
returns table (
  campaign_id uuid,
  spend numeric,
  clicks bigint,
  impressions bigint,
  conversions numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.campaign_id,
    coalesce(sum(s.spend), 0)::numeric(14, 2) as spend,
    coalesce(sum(s.clicks), 0)::bigint as clicks,
    coalesce(sum(s.impressions), 0)::bigint as impressions,
    coalesce(sum(s.conversions), 0)::numeric(14, 2) as conversions
  from public.ad_daily_stats s
  where s.campaign_id = any (p_campaign_ids)
    and s.date between p_start and p_end
  group by s.campaign_id;
$$;

revoke all on function public.admin_campaign_stats_agg(uuid[], date, date)
  from public, anon;
grant execute on function public.admin_campaign_stats_agg(uuid[], date, date)
  to authenticated;

-- Summary RPC: created_at::date index kullanamaz; aralık karşılaştırması
create index if not exists leads_created_at_brin_idx
  on public.leads using brin (created_at);

create index if not exists ad_daily_stats_date_campaign_idx
  on public.ad_daily_stats (date, campaign_id);

-- admin_marketing_summary lead filtresi: timestamptz aralığı (index dostu)
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
      (l.created_at at time zone 'Europe/Istanbul')::date as lead_date,
      l.status,
      l.channel,
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
      nullif(btrim(l.ctwa_clid), '') as effective_ctwa_clid,
      coalesce(
        nullif(btrim(l.utm_source), ''),
        nullif(btrim(ls.utm_source), ''),
        public.url_query_param(ls.landing_url, 'utm_source')
      ) as effective_utm_source,
      coalesce(
        nullif(btrim(l.utm_medium), ''),
        nullif(btrim(ls.utm_medium), ''),
        public.url_query_param(ls.landing_url, 'utm_medium')
      ) as effective_utm_medium,
      ls.landing_url
    from public.leads l
    left join public.lead_sources ls on ls.lead_ref = l.lead_ref
    where l.created_at >= (start_date::timestamp at time zone 'Europe/Istanbul')
      and l.created_at < ((end_date + 1)::timestamp at time zone 'Europe/Istanbul')
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
          or la.effective_ctwa_clid is not null
          or lower(btrim(coalesce(la.channel, ''))) = 'meta_ctwa'
          then 'meta'
        when lower(btrim(coalesce(la.effective_utm_source, ''))) in (
          'google', 'googleads', 'adwords', 'google_ads', 'youtube'
        ) then 'google_ads'
        when lower(btrim(coalesce(la.effective_utm_source, ''))) in (
          'facebook', 'fb', 'ig', 'instagram', 'meta', 'fbads', 'an'
        ) then 'meta'
        when lower(btrim(coalesce(la.effective_utm_medium, ''))) in (
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
