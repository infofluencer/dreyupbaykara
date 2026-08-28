-- Ek reklam click ID'leri: gbraid/wbraid (Google iOS), msclkid (Bing), ttclid (TikTok)

alter table public.lead_sources
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists msclkid text,
  add column if not exists ttclid text;

alter table public.leads
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists msclkid text,
  add column if not exists ttclid text;

create or replace view public.lead_source_report
with (security_invoker = false, security_barrier = true)
as
select
  id,
  lead_ref,
  site,
  page_path,
  channel,
  campaign,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_content,
  utm_term,
  gclid,
  fbclid,
  gbraid,
  wbraid,
  msclkid,
  ttclid,
  matched_lead_id,
  matched_at,
  created_at
from public.lead_sources;

revoke all on public.lead_source_report from public, anon;
grant select on public.lead_source_report to authenticated;

create or replace function public.admin_dashboard_source_stats()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with classified as (
    select
      case
        when nullif(btrim(coalesce(gclid, '')), '') is not null
          or nullif(btrim(coalesce(gbraid, '')), '') is not null
          or nullif(btrim(coalesce(wbraid, '')), '') is not null
          then 'google_ads'
        when nullif(btrim(coalesce(fbclid, '')), '') is not null then 'meta'
        when lower(btrim(coalesce(utm_source, ''))) in (
          'google', 'googleads', 'adwords', 'google_ads', 'youtube'
        ) then 'google_ads'
        when lower(btrim(coalesce(utm_source, ''))) in (
          'facebook', 'fb', 'ig', 'instagram', 'meta', 'fbads', 'an'
        ) then 'meta'
        when nullif(btrim(coalesce(utm_source, '')), '') is not null
          or nullif(btrim(coalesce(utm_medium, '')), '') is not null
          or nullif(btrim(coalesce(utm_campaign, '')), '') is not null
          or nullif(btrim(coalesce(campaign, '')), '') is not null
          or nullif(btrim(coalesce(msclkid, '')), '') is not null
          or nullif(btrim(coalesce(ttclid, '')), '') is not null
          then 'other'
        else 'organic'
      end as platform,
      case
        when channel in ('landing', 'page') then 'landing'
        when channel = 'lead_form' then 'form'
        else 'whatsapp'
      end as event
    from public.lead_sources
  )
  select json_build_object(
    'platforms', json_build_object(
      'google_ads', count(*) filter (where platform = 'google_ads'),
      'meta', count(*) filter (where platform = 'meta'),
      'other', count(*) filter (where platform = 'other'),
      'organic', count(*) filter (where platform = 'organic')
    ),
    'events', json_build_object(
      'landing', count(*) filter (where event = 'landing'),
      'whatsapp', count(*) filter (where event = 'whatsapp'),
      'form', count(*) filter (where event = 'form')
    )
  )
  from classified;
$$;

revoke all on function public.admin_dashboard_source_stats() from public, anon;
grant execute on function public.admin_dashboard_source_stats() to authenticated;
