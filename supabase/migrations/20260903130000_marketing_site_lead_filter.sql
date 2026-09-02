-- Reklam sitesi filtresinde CRM lead: utm_campaign → ad_campaigns.site eşleşmesi
-- (lead kaydı genelde endoskopikbelameliyati sitesinde kalır)

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
      and (
        site_filter is null
        or l.site = site_filter
        or (
          site_filter in ('endospineistanbul', 'fitikameliyati')
          and exists (
            select 1
            from public.ad_campaigns c
            where c.site = site_filter
              and nullif(
                btrim(coalesce(l.utm_campaign, l.campaign, '')),
                ''
              ) is not null
              and (
                lower(btrim(coalesce(l.utm_campaign, l.campaign, '')))
                  = lower(c.name)
                or lower(btrim(coalesce(l.utm_campaign, l.campaign, '')))
                  like '%' || lower(c.name) || '%'
                or lower(c.name) like '%'
                  || lower(btrim(coalesce(l.utm_campaign, l.campaign, '')))
                  || '%'
                or btrim(coalesce(l.utm_campaign, l.campaign, ''))
                  = c.external_campaign_id
              )
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
