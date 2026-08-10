-- Refresh SEO title, description, and snippet (excerpt) for core marketing pages.

update public.content_pages
set
  excerpt = 'Full endoskopik omurga cerrahisi: bel fıtığı, boyun fıtığı ve kanal darlığında hızlı iyileşme.',
  seo_title = 'Op. Dr. Eyüp Baykara | Beyin ve Sinir Cerrahisi Uzmanı',
  seo_description = 'Full endoskopik bel fıtığı, boyun fıtığı ve kanal darlığı ameliyatı. Minimal invaziv omurga cerrahisi — Op. Dr. Eyüp Baykara, Silivri / İstanbul.'
where slug = '/';

update public.content_pages
set
  excerpt = 'Beyin ve sinir cerrahisi uzmanı. Full endoskopik, minimal invaziv omurga cerrahisinde deneyimli.',
  seo_title = 'Hakkımızda | Op. Dr. Eyüp Baykara',
  seo_description = 'Op. Dr. Eyüp Baykara, beyin ve sinir cerrahisi uzmanı. Full endoskopik bel, boyun fıtığı ve kanal darlığı cerrahisinde deneyimli yaklaşım.'
where slug = '/hakkimizda';

update public.content_pages
set
  excerpt = 'Randevu ve sorularınız için telefon, WhatsApp veya e-posta ile bize ulaşabilirsiniz.',
  seo_title = 'İletişim | Op. Dr. Eyüp Baykara',
  seo_description = 'Randevu ve iletişim: Özel Silivri Anadolu Hastanesi. Telefon 0530 783 72 24, WhatsApp veya e-posta ile ulaşın.'
where slug = '/iletisim';

update public.content_pages
set
  excerpt = 'Ameliyat sonrası videolar ve gerçek hasta yorumları — iyileşme hikâyelerini yakından görün.',
  seo_title = 'Hasta Deneyimleri | Op. Dr. Eyüp Baykara',
  seo_description = 'Full endoskopik ameliyat sonrası hasta videoları ve gerçek yorumlar. Bel fıtığı, boyun fıtığı ve kanal darlığı iyileşme hikâyeleri.'
where slug = '/hasta-deneyimleri';

update public.content_pages
set
  excerpt = 'Omurga sağlığı, fıtık ve endoskopik cerrahi hakkında güncel yazılar.',
  seo_title = 'Blog | Op. Dr. Eyüp Baykara',
  seo_description = 'Bel fıtığı, boyun fıtığı ve kanal darlığı hakkında bilgilendirici yazılar. Full endoskopik omurga cerrahisi rehberi.'
where slug = '/blog';
