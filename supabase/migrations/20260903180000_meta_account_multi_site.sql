-- Meta hesap → birden fazla site (örn. fıtık + endospine aynı ad account)

alter table public.ad_customer_site_map
  drop constraint if exists ad_customer_site_map_pk;

alter table public.ad_customer_site_map
  add constraint ad_customer_site_map_pk
  primary key (platform, external_customer_id, site);

drop policy if exists "ad_customer_site_map_staff_delete" on public.ad_customer_site_map;
create policy "ad_customer_site_map_staff_delete"
  on public.ad_customer_site_map for delete to authenticated
  using (public.current_role() in ('admin', 'doctor', 'agency'));

-- Hakan eşlemesi:
-- act_2990529357911124 → fitikameliyati + endospineistanbul
-- act_1531490041307558 → endoskopikbelameliyati
insert into public.ad_customer_site_map (platform, external_customer_id, site, label)
values
  ('meta', '2990529357911124', 'endospineistanbul', 'Meta — Endospine / Fıtık hesabı'),
  ('meta', '2990529357911124', 'fitikameliyati', 'Meta — Endospine / Fıtık hesabı'),
  ('meta', '1531490041307558', 'endoskopikbelameliyati', 'Meta — Endoskopik Bel hesabı')
on conflict (platform, external_customer_id, site) do update
set label = excluded.label;
