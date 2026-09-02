-- Google/Meta reklam hesap ID → CRM site kodu (kampanya prefix'i olmadan otomatik eşleşme)

create table if not exists public.ad_customer_site_map (
  platform text not null check (platform in ('google_ads', 'meta')),
  external_customer_id text not null,
  site text not null,
  label text,
  created_at timestamptz not null default now(),
  constraint ad_customer_site_map_pk primary key (platform, external_customer_id)
);

create index if not exists ad_customer_site_map_site_idx
  on public.ad_customer_site_map (site);

insert into public.ad_customer_site_map (platform, external_customer_id, site, label)
values
  ('google_ads', '6474329013', 'endospineistanbul', 'Endospine İstanbul'),
  ('google_ads', '9298256533', 'fitikameliyati', 'Fıtık Ameliyatı')
on conflict (platform, external_customer_id) do update
set site = excluded.site,
    label = excluded.label;

alter table public.ad_customer_site_map enable row level security;

create policy "ad_customer_site_map_staff_select"
  on public.ad_customer_site_map for select to authenticated
  using (public.current_role() in ('admin', 'doctor', 'assistant', 'agency'));

create policy "ad_customer_site_map_staff_insert"
  on public.ad_customer_site_map for insert to authenticated
  with check (public.current_role() in ('admin', 'doctor', 'agency'));

create policy "ad_customer_site_map_staff_update"
  on public.ad_customer_site_map for update to authenticated
  using (public.current_role() in ('admin', 'doctor', 'agency'))
  with check (public.current_role() in ('admin', 'doctor', 'agency'));
