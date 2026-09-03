-- Click-to-WhatsApp (ctwa_clid) CRM lead: sayıma geri al + geçmiş sohbetlerden lead aç

-- Mevcut CRM kaydına webhook referral'dan ctwa_clid yaz
update public.leads l
set ctwa_clid = src.ctwa_clid
from (
  select distinct on (c.lead_id)
    c.lead_id,
    nullif(btrim(m.raw_payload #>> '{referral,ctwa_clid}'), '') as ctwa_clid
  from public.conversations c
  join public.messages m on m.conversation_id = c.id
  where c.lead_id is not null
    and nullif(btrim(m.raw_payload #>> '{referral,ctwa_clid}'), '') is not null
  order by c.lead_id, m.created_at
) src
where l.id = src.lead_id
  and nullif(btrim(coalesce(l.ctwa_clid, '')), '') is null;

-- Referral'ı olan, lead'i olmayan sohbet: var olan lead'e bağla veya yeni aç
with ctwa_missing as (
  select distinct on (c.id)
    c.id as conversation_id,
    c.contact_id,
    m.created_at as first_at,
    nullif(btrim(m.raw_payload #>> '{referral,ctwa_clid}'), '') as ctwa_clid,
    nullif(btrim(m.raw_payload #>> '{referral,source_url}'), '') as source_url,
    nullif(btrim(m.raw_payload #>> '{referral,headline}'), '') as headline,
    exists (
      select 1
      from public.messages om
      where om.conversation_id = c.id
        and om.direction = 'outbound'
    ) as has_outbound,
    (
      select l.id
      from public.leads l
      where l.contact_id = c.contact_id
      order by l.created_at desc
      limit 1
    ) as existing_lead_id
  from public.conversations c
  join public.messages m on m.conversation_id = c.id
  where c.lead_id is null
    and nullif(btrim(m.raw_payload #>> '{referral,ctwa_clid}'), '') is not null
  order by c.id, m.created_at
),
linked as (
  update public.conversations c
  set lead_id = cm.existing_lead_id
  from ctwa_missing cm
  where c.id = cm.conversation_id
    and cm.existing_lead_id is not null
  returning c.id
),
stamped as (
  update public.leads l
  set ctwa_clid = coalesce(nullif(btrim(l.ctwa_clid), ''), cm.ctwa_clid)
  from ctwa_missing cm
  where l.id = cm.existing_lead_id
    and cm.existing_lead_id is not null
  returning l.id
),
created as (
  insert into public.leads (
    contact_id,
    channel,
    utm_source,
    utm_medium,
    campaign,
    ctwa_clid,
    site,
    status,
    created_at,
    updated_at
  )
  select
    cm.contact_id,
    'meta_ctwa',
    'facebook',
    'paid',
    cm.headline,
    cm.ctwa_clid,
    case
      when coalesce(cm.source_url, '') ilike '%endospineistanbul.com%'
        then 'endospineistanbul'
      when coalesce(cm.source_url, '') ilike '%fitikameliyati.com%'
        then 'fitikameliyati'
      else 'endoskopikbelameliyati'
    end,
    case when cm.has_outbound then 'arandi' else 'yeni' end,
    cm.first_at,
    cm.first_at
  from ctwa_missing cm
  where cm.existing_lead_id is null
  returning id, contact_id
)
update public.conversations c
set lead_id = created.id
from created
where c.contact_id = created.contact_id
  and c.lead_id is null;

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
