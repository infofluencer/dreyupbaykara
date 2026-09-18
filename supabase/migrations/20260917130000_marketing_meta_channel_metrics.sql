-- Meta kanalı: günlük harcama/lead ve ameliyat yalnızca Meta;
-- Insights RPC kampanya Action kırılımını DB'de toplar.

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
  with bounds as (
    select
      start_date as d0,
      end_date as d1,
      (end_date - start_date) as day_span,
      (start_date::timestamp at time zone 'Europe/Istanbul') as ts0,
      ((end_date + 1)::timestamp at time zone 'Europe/Istanbul') as ts1
  ),
  -- Meta: tek site → c.site; çoklu site + prefix yok → site null, hesap haritası ile dahil
  filtered_campaigns as (
    select c.id, c.platform, c.site
    from public.ad_campaigns c
    where site_filter is null
       or c.site = site_filter
       or (
         c.platform = 'meta'
         and c.site is null
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
  ),
  spend_by_day as (
    select
      s.date,
      sum(s.spend)::numeric(12, 2) as spend,
      sum(s.spend) filter (where fc.platform = 'google_ads')::numeric(12, 2) as google_spend,
      sum(s.spend) filter (where fc.platform = 'meta')::numeric(12, 2) as meta_spend
    from public.ad_daily_stats s
    join filtered_campaigns fc on fc.id = s.campaign_id
    cross join bounds b
    where s.date between b.d0 and b.d1
    group by s.date
  ),
  spend_totals as (
    select
      coalesce(sum(spend), 0)::numeric(12, 2) as total_spend,
      coalesce(sum(google_spend), 0)::numeric(12, 2) as google_spend,
      coalesce(sum(meta_spend), 0)::numeric(12, 2) as meta_spend
    from spend_by_day
  ),
  classified_leads as (
    select
      l.id,
      (l.created_at at time zone 'Europe/Istanbul')::date as lead_date,
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
      end as platform
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
            or (
              nullif(btrim(coalesce(l.gclid, '')), '') is not null
              and exists (
                select 1
                from public.google_ad_clicks gc
                join public.ad_campaigns c on c.id = gc.campaign_id
                where gc.gclid = l.gclid
                  and c.site = site_filter
              )
            )
          )
        )
      )
  ),
  lead_totals as (
    select
      count(*)::int as total_leads,
      count(*) filter (where status in ('ameliyat_olacak', 'ameliyat_edildi', 'bitti'))::int as appointment_leads,
      count(*) filter (
        where platform = 'google_ads'
          and status in ('ameliyat_olacak', 'ameliyat_edildi', 'bitti')
      )::int as google_appointment_leads,
      count(*) filter (
        where platform = 'meta'
          and status in ('ameliyat_olacak', 'ameliyat_edildi', 'bitti')
      )::int as meta_appointment_leads,
      count(*) filter (where platform = 'google_ads')::int as google_leads,
      count(*) filter (where platform = 'meta')::int as meta_leads
    from classified_leads
  ),
  leads_by_bucket as (
    select
      case
        when (select day_span from bounds) > 90
          then (date_trunc('week', lead_date::timestamp))::date
        else lead_date
      end as date,
      count(*)::int as leads,
      count(*) filter (where platform = 'google_ads')::int as google_leads,
      count(*) filter (where platform = 'meta')::int as meta_leads
    from classified_leads
    group by 1
  ),
  spend_by_bucket as (
    select
      case
        when (select day_span from bounds) > 90
          then (date_trunc('week', date::timestamp))::date
        else date
      end as date,
      sum(spend)::numeric(12, 2) as spend,
      sum(google_spend)::numeric(12, 2) as google_spend,
      sum(meta_spend)::numeric(12, 2) as meta_spend
    from spend_by_day
    group by 1
  ),
  bucket_dates as (
    select generate_series(
      case
        when (select day_span from bounds) > 90
          then (date_trunc('week', (select d0 from bounds)::timestamp))::date
        else (select d0 from bounds)
      end,
      (select d1 from bounds),
      case
        when (select day_span from bounds) > 90 then interval '7 days'
        else interval '1 day'
      end
    )::date as date
  ),
  daily_series as (
    select
      d.date,
      coalesce(s.spend, 0)::numeric(12, 2) as spend,
      coalesce(s.google_spend, 0)::numeric(12, 2) as google_spend,
      coalesce(s.meta_spend, 0)::numeric(12, 2) as meta_spend,
      coalesce(l.leads, 0)::int as leads,
      coalesce(l.google_leads, 0)::int as google_leads,
      coalesce(l.meta_leads, 0)::int as meta_leads
    from bucket_dates d
    left join spend_by_bucket s on s.date = d.date
    left join leads_by_bucket l on l.date = d.date
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
    'google_appointment_leads', lt.google_appointment_leads,
    'meta_appointment_leads', lt.meta_appointment_leads,
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
          'leads', ds.leads,
          'google_spend', ds.google_spend,
          'meta_spend', ds.meta_spend,
          'google_leads', ds.google_leads,
          'meta_leads', ds.meta_leads
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
      coalesce(sum(s.conversions), 0)::numeric(12, 2) as total_conversions
    from public.ad_daily_stats s
    where s.campaign_id in (select id from meta_campaigns)
      and s.date between start_date and end_date
  ),
  series as (
    select
      s.date,
      sum(s.spend)::numeric(12, 2) as spend,
      sum(s.conversions)::numeric(12, 2) as conversions,
      sum(s.clicks)::bigint as clicks
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
  )
  select jsonb_build_object(
    'totalSpend', (select total_spend from daily),
    'totalClicks', (select total_clicks from daily),
    'totalImpressions', (select total_impressions from daily),
    'totalConversions', (select total_conversions from daily),
    'actions', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'name', name,
        'conversions', conversions,
        'spend', spend
      )) from conversion_actions),
      '[]'::jsonb
    ),
    'daily', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'date', date,
        'spend', spend,
        'conversions', conversions,
        'clicks', clicks
      ) order by date) from series),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.admin_meta_marketing_insights(date, date, text) from public, anon;
grant execute on function public.admin_meta_marketing_insights(date, date, text) to authenticated;
