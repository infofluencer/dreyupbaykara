-- Admin Özet: WA + kaynak aggregate'lerini DB'de hesapla (satır çekmeden).
-- classifyAdPlatform / classifySourceEvent (src/lib/crm/source-kind.ts) ile aynı kurallar.

create or replace function public.admin_dashboard_wa_stats()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'open_count', (
      select count(*)::int
      from public.conversations
      where status = 'open'
    ),
    'unread_sum', (
      select coalesce(sum(unread_count), 0)::int
      from public.conversations
    ),
    'awaiting_count', (
      select count(*)::int
      from public.conversations
      where status = 'open'
        and last_message_direction = 'inbound'
    )
  );
$$;

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
        when nullif(btrim(coalesce(gclid, '')), '') is not null then 'google_ads'
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

revoke all on function public.admin_dashboard_wa_stats() from public, anon;
revoke all on function public.admin_dashboard_source_stats() from public, anon;
grant execute on function public.admin_dashboard_wa_stats() to authenticated;
grant execute on function public.admin_dashboard_source_stats() to authenticated;
