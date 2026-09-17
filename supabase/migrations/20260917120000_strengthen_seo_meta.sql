-- Sync CMS SEO fields with strengthened static PAGE_SEO (index için).

update public.content_pages
set
  excerpt = 'Full endoskopik omurga cerrahisi: bel fıtığı, boyun fıtığı ve kanal darlığında hızlı iyileşme.',
  seo_title = 'Endoskopik Bel Ameliyatı | Op. Dr. Eyüp Baykara',
  seo_description = 'Full endoskopik bel fıtığı, boyun fıtığı ve kanal darlığı ameliyatı. Minimal invaziv, aynı gün taburcu — Op. Dr. Eyüp Baykara, Silivri / İstanbul.'
where slug = '/';

update public.content_pages
set
  excerpt = 'Beyin ve sinir cerrahisi uzmanı. Full endoskopik, minimal invaziv omurga cerrahisinde deneyimli.',
  seo_title = 'Op. Dr. Eyüp Baykara Kimdir? | Beyin ve Sinir Cerrahisi',
  seo_description = 'Op. Dr. Eyüp Baykara — full endoskopik bel, boyun fıtığı ve kanal darlığı cerrahisinde uzman beyin ve sinir cerrahı. Silivri / İstanbul.'
where slug = '/hakkimizda';

update public.content_pages
set
  excerpt = 'Randevu ve sorularınız için telefon, WhatsApp veya e-posta ile bize ulaşabilirsiniz.',
  seo_title = 'Randevu ve İletişim | Op. Dr. Eyüp Baykara',
  seo_description = 'Endoskopik bel fıtığı randevusu: Özel Silivri Anadolu Hastanesi. Tel 0530 783 72 24 — WhatsApp veya e-posta ile ulaşın.'
where slug = '/iletisim';

update public.content_pages
set
  excerpt = 'Ameliyat sonrası videolar ve gerçek hasta yorumları — iyileşme hikâyelerini yakından görün.',
  seo_title = 'Hasta Deneyimleri ve Yorumlar | Op. Dr. Eyüp Baykara',
  seo_description = 'Full endoskopik bel fıtığı ve kanal darlığı ameliyatı sonrası hasta videoları, Google yorumları ve gerçek iyileşme hikâyeleri.'
where slug = '/hasta-deneyimleri';

update public.content_pages
set
  excerpt = 'Omurga sağlığı, fıtık ve endoskopik cerrahi hakkında güncel yazılar.',
  seo_title = 'Bel Fıtığı ve Endoskopik Cerrahi Blog | Op. Dr. Eyüp Baykara',
  seo_description = 'Bel fıtığı, siyatik, boyun fıtığı ve kanal darlığı hakkında bilgilendirici yazılar. Full endoskopik omurga cerrahisi rehberi.'
where slug = '/blog';
