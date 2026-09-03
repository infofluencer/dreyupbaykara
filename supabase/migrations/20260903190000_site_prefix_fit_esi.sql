-- Meta/Google kampanya adı [PREFIX] → site (ajans standardı)

insert into public.site_prefix_map (prefix, site)
values
  ('BEL', 'endoskopikbelameliyati'),
  ('FIT', 'fitikameliyati'),
  ('ESI', 'endospineistanbul'),
  ('ENDO', 'endospineistanbul'),
  ('FITIK', 'fitikameliyati')
on conflict (prefix) do update
set site = excluded.site;
