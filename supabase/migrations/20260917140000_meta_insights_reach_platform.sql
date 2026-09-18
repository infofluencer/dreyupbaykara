-- Meta Insights: reach / unique click / platform-cihaz kırılımı
-- CRM hunisi ayrı RPC (sohbet → lead → ameliyat)

alter table public.ad_daily_stats
  add column if not exists reach bigint,
  add column if not exists frequency numeric(10, 4),
  add column if not exists unique_clicks bigint,
  add column if not exists inline_link_clicks bigint;

alter table public.ad_segment_daily_stats
  drop constraint if exists ad_segment_daily_stats_segment_type_check;

alter table public.ad_segment_daily_stats
  add constraint ad_segment_daily_stats_segment_type_check
  check (
    segment_type in (
      'device',
      'conversion_action',
      'geo',
      'publisher_platform'
    )
  );

create or replace function public.admin_meta_marketing_insights(
  start_date date,
  end_date date,
  site_filter text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with meta_campaigns as (
    select c.id
    from public.ad_campaigns c
    where c.platform = 'meta'
      and (
        site_filter is null
        or c.site = site_filter
        or (
          c.site is null
          and exists (
            select 1
            from public.ad_accounts_safe a
            join public.ad_customer_site_map m
              on m.platform = 'meta'
             and m.site = site_filter
             and regexp_replace(m.external_customer_id, '\D', '', 'g')
               = regexp_replace(a.external_account_id, '\D', '', 'g')
            where a.id = c.account_id
          )
        )
      )
  ),
  daily as (
    select
      coalesce(sum(s.spend), 0)::numeric(12, 2) as total_spend,
      coalesce(sum(s.clicks), 0)::bigint as total_clicks,
      coalesce(sum(s.impressions), 0)::bigint as total_impressions,
      coalesce(sum(s.conversions), 0)::numeric(12, 2) as total_conversions,
      coalesce(sum(s.reach), 0)::bigint as total_reach,
      coalesce(sum(s.unique_clicks), 0)::bigint as total_unique_clicks,
      coalesce(sum(s.inline_link_clicks), 0)::bigint as total_inline_link_clicks
    from public.ad_daily_stats s
    where s.campaign_id in (select id from meta_campaigns)
      and s.date between start_date and end_date
  ),
  series as (
    select
      s.date,
      sum(s.spend)::numeric(12, 2) as spend,
      sum(s.conversions)::numeric(12, 2) as conversions,
      sum(s.clicks)::bigint as clicks,
      coalesce(sum(s.reach), 0)::bigint as reach
    from public.ad_daily_stats s
    where s.campaign_id in (select id from meta_campaigns)
      and s.date between start_date and end_date
    group by s.date
    order by s.date
  ),
  conversion_actions as (
    select
      segment_value as name,
      sum(conversions)::numeric(12, 2) as conversions,
      sum(spend)::numeric(12, 2) as spend
    from public.ad_segment_daily_stats
    where campaign_id in (select id from meta_campaigns)
      and segment_type = 'conversion_action'
      and date between start_date and end_date
    group by segment_value
    having sum(conversions) > 0
    order by sum(conversions) desc
    limit 20
  ),
  platforms as (
    select
      segment_value as name,
      sum(spend)::numeric(12, 2) as spend,
      sum(impressions)::bigint as impressions,
      sum(clicks)::bigint as clicks,
      sum(conversions)::numeric(12, 2) as conversions
    from public.ad_segment_daily_stats
    where campaign_id in (select id from meta_campaigns)
      and segment_type = 'publisher_platform'
      and date between start_date and end_date
    group by segment_value
    order by sum(spend) desc
  ),
  devices as (
    select
      segment_value as name,
      sum(spend)::numeric(12, 2) as spend,
      sum(impressions)::bigint as impressions,
      sum(clicks)::bigint as clicks,
      sum(conversions)::numeric(12, 2) as conversions
    from public.ad_segment_daily_stats
    where campaign_id in (select id from meta_campaigns)
      and segment_type = 'device'
      and date between start_date and end_date
    group by segment_value
    order by sum(spend) desc
  )
  select jsonb_build_object(
    'totalSpend', (select total_spend from daily),
    'totalClicks', (select total_clicks from daily),
    'totalImpressions', (select total_impressions from daily),
    'totalConversions', (select total_conversions from daily),
    'totalReach', (select total_reach from daily),
    'totalUniqueClicks', (select total_unique_clicks from daily),
    'totalInlineLinkClicks', (select total_inline_link_clicks from daily),
    'actions', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'key', name,
        'name', name,
        'conversions', conversions,
        'spend', spend
      ) order by conversions desc) from conversion_actions),
      '[]'::jsonb
    ),
    'platforms', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'key', name,
        'spend', spend,
        'impressions', impressions,
        'clicks', clicks,
        'conversions', conversions
      ) order by spend desc) from platforms),
      '[]'::jsonb
    ),
    'devices', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'key', name,
        'spend', spend,
        'impressions', impressions,
        'clicks', clicks,
        'conversions', conversions
      ) order by spend desc) from devices),
      '[]'::jsonb
    ),
    'daily', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'date', date,
        'spend', spend,
        'conversions', conversions,
        'clicks', clicks,
        'reach', reach
      ) order by date) from series),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.admin_meta_marketing_insights(date, date, text) from public, anon;
grant execute on function public.admin_meta_marketing_insights(date, date, text) to authenticated;

create or replace function public.admin_meta_crm_breakdown(
  start_date date,
  end_date date,
  site_filter text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      (start_date::timestamp at time zone 'Europe/Istanbul') as ts0,
      ((end_date + 1)::timestamp at time zone 'Europe/Istanbul') as ts1
  ),
  classified as (
    select
      l.status,
      case
        when lower(btrim(coalesce(l.channel, ''))) = 'calendar'
          then 'other'
        when nullif(btrim(coalesce(l.gclid, '')), '') is not null
          or nullif(btrim(coalesce(l.gbraid, '')), '') is not null
          or nullif(btrim(coalesce(l.wbraid, '')), '') is not null
          then 'google_ads'
        when nullif(btrim(coalesce(l.fbclid, '')), '') is not null
          or nullif(btrim(coalesce(l.ctwa_clid, '')), '') is not null
          or lower(btrim(coalesce(l.channel, ''))) = 'meta_ctwa'
          then 'meta'
        when lower(btrim(coalesce(l.utm_source, ''))) in (
          'google', 'googleads', 'adwords', 'google_ads', 'youtube'
        ) then 'google_ads'
        when lower(btrim(coalesce(l.utm_source, ''))) in (
          'facebook', 'fb', 'ig', 'instagram', 'meta', 'fbads', 'an'
        ) then 'meta'
        when lower(btrim(coalesce(l.utm_medium, ''))) in (
          'facebook', 'fb', 'ig', 'instagram', 'meta', 'fbads', 'an'
        ) then 'meta'
        else 'other'
      end as platform,
      case
        when nullif(btrim(coalesce(l.ctwa_clid, '')), '') is not null
          or lower(btrim(coalesce(l.channel, ''))) = 'meta_ctwa'
          then 'ctwa'
        when nullif(btrim(coalesce(l.fbclid, '')), '') is not null
          then 'fbclid'
        when lower(btrim(coalesce(l.utm_source, ''))) in (
          'facebook', 'fb', 'ig', 'instagram', 'meta', 'fbads', 'an'
        ) or lower(btrim(coalesce(l.utm_medium, ''))) in (
          'facebook', 'fb', 'ig', 'instagram', 'meta', 'fbads', 'an'
        ) then 'utm'
        else 'other'
      end as meta_touch
    from public.leads l
    cross join bounds b
    where l.created_at >= b.ts0
      and l.created_at < b.ts1
      and (
        site_filter is null
        or l.site = site_filter
        or (
          site_filter in ('endospineistanbul', 'fitikameliyati')
          and (
            exists (
              select 1
              from public.ad_campaigns c
              left join public.ad_accounts_safe a on a.id = c.account_id
              where nullif(btrim(coalesce(l.utm_campaign, l.campaign, '')), '') is not null
                and (
                  c.site = site_filter
                  or (
                    c.platform = 'meta'
                    and c.site is null
                    and exists (
                      select 1
                      from public.ad_customer_site_map m
                      where m.platform = 'meta'
                        and m.site = site_filter
                        and regexp_replace(m.external_customer_id, '\D', '', 'g')
                          = regexp_replace(coalesce(a.external_account_id, ''), '\D', '', 'g')
                    )
                  )
                )
                and (
                  lower(btrim(coalesce(l.utm_campaign, l.campaign, ''))) = lower(c.name)
                  or lower(btrim(coalesce(l.utm_campaign, l.campaign, '')))
                    like '%' || lower(c.name) || '%'
                  or lower(c.name) like '%'
                    || lower(btrim(coalesce(l.utm_campaign, l.campaign, '')))
                    || '%'
                  or btrim(coalesce(l.utm_campaign, l.campaign, '')) = c.external_campaign_id
                )
            )
          )
        )
      )
  ),
  meta_leads as (
    select * from classified where platform = 'meta'
  )
  select jsonb_build_object(
    'leads', (select count(*)::int from meta_leads),
    'appointmentLeads', (
      select count(*)::int from meta_leads
      where status in ('ameliyat_olacak', 'ameliyat_edildi', 'bitti')
    ),
    'surgeryDone', (
      select count(*)::int from meta_leads
      where status in ('ameliyat_edildi', 'bitti')
    ),
    'funnel', jsonb_build_object(
      'yeni', (select count(*)::int from meta_leads where status = 'yeni'),
      'arandi', (select count(*)::int from meta_leads where status = 'arandi'),
      'muayene_edildi', (select count(*)::int from meta_leads where status = 'muayene_edildi'),
      'ameliyat_olacak', (select count(*)::int from meta_leads where status = 'ameliyat_olacak'),
      'ameliyat_edildi', (select count(*)::int from meta_leads where status = 'ameliyat_edildi'),
      'bitti', (select count(*)::int from meta_leads where status = 'bitti')
    ),
    'attribution', jsonb_build_object(
      'ctwa', (select count(*)::int from meta_leads where meta_touch = 'ctwa'),
      'fbclid', (select count(*)::int from meta_leads where meta_touch = 'fbclid'),
      'utm', (select count(*)::int from meta_leads where meta_touch = 'utm'),
      'other', (select count(*)::int from meta_leads where meta_touch = 'other')
    )
  );
$$;

revoke all on function public.admin_meta_crm_breakdown(date, date, text) from public, anon;
grant execute on function public.admin_meta_crm_breakdown(date, date, text) to authenticated;
