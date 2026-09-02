-- Aggregated Google insights (avoids fetching 10k+ segment/search rows in app)

create or replace function public.admin_google_marketing_insights(
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
  with google_campaigns as (
    select id
    from public.ad_campaigns
    where platform = 'google_ads'
      and (site_filter is null or site = site_filter)
  ),
  daily as (
    select
      coalesce(sum(s.spend), 0)::numeric(12, 2) as total_spend,
      coalesce(sum(s.clicks), 0)::bigint as total_clicks,
      coalesce(sum(s.conversions), 0)::numeric(12, 2) as total_conversions,
      avg(s.ctr) filter (where s.ctr > 0) as avg_ctr,
      avg(s.average_cpc) filter (where s.average_cpc > 0) as avg_cpc,
      avg(s.search_impression_share) filter (where s.search_impression_share > 0) as avg_impression_share,
      avg(s.search_budget_lost_impression_share)
        filter (where s.search_budget_lost_impression_share > 0) as budget_lost_share,
      avg(s.search_rank_lost_impression_share)
        filter (where s.search_rank_lost_impression_share > 0) as rank_lost_share
    from public.ad_daily_stats s
    where s.campaign_id in (select id from google_campaigns)
      and s.date between start_date and end_date
  ),
  devices as (
    select
      segment_value as device,
      sum(spend)::numeric(12, 2) as spend,
      sum(clicks)::bigint as clicks,
      sum(conversions)::numeric(12, 2) as conversions
    from public.ad_segment_daily_stats
    where campaign_id in (select id from google_campaigns)
      and segment_type = 'device'
      and date between start_date and end_date
    group by segment_value
    order by sum(spend) desc
  ),
  conversion_actions as (
    select
      segment_value as name,
      sum(conversions)::numeric(12, 2) as conversions,
      sum(spend)::numeric(12, 2) as spend
    from public.ad_segment_daily_stats
    where campaign_id in (select id from google_campaigns)
      and segment_type = 'conversion_action'
      and date between start_date and end_date
    group by segment_value
    having sum(conversions) > 0
    order by sum(conversions) desc
    limit 20
  ),
  search_terms as (
    select
      search_term as term,
      sum(spend)::numeric(12, 2) as spend,
      sum(clicks)::bigint as clicks,
      sum(conversions)::numeric(12, 2) as conversions
    from public.ad_search_term_daily
    where campaign_id in (select id from google_campaigns)
      and date between start_date and end_date
    group by search_term
    order by sum(spend) desc
    limit 15
  ),
  landing_pages as (
    select
      landing_page as url,
      sum(spend)::numeric(12, 2) as spend,
      sum(clicks)::bigint as clicks,
      sum(conversions)::numeric(12, 2) as conversions
    from public.ad_landing_page_daily
    where campaign_id in (select id from google_campaigns)
      and date between start_date and end_date
    group by landing_page
    order by sum(spend) desc
    limit 15
  )
  select jsonb_build_object(
    'totalSpend', (select total_spend from daily),
    'totalClicks', (select total_clicks from daily),
    'totalConversions', (select total_conversions from daily),
    'avgCtr', (select avg_ctr from daily),
    'avgCpc', (select avg_cpc from daily),
    'avgImpressionShare', (select avg_impression_share from daily),
    'budgetLostShare', (select budget_lost_share from daily),
    'rankLostShare', (select rank_lost_share from daily),
    'devices', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'device', device,
        'spend', spend,
        'clicks', clicks,
        'conversions', conversions
      )) from devices),
      '[]'::jsonb
    ),
    'conversionActions', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'name', name,
        'conversions', conversions,
        'spend', spend
      )) from conversion_actions),
      '[]'::jsonb
    ),
    'searchTerms', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'term', term,
        'spend', spend,
        'clicks', clicks,
        'conversions', conversions
      )) from search_terms),
      '[]'::jsonb
    ),
    'landingPages', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'url', url,
        'spend', spend,
        'clicks', clicks,
        'conversions', conversions
      )) from landing_pages),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.admin_google_marketing_insights(date, date, text) from public, anon;
grant execute on function public.admin_google_marketing_insights(date, date, text) to authenticated;
