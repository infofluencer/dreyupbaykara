-- Update treatment page SEO titles, descriptions, and snippets (excerpt).

update public.content_pages
set
  excerpt = 'Disk kaymasıyla oluşan bel fıtığında küçük kesi, az doku hasarı ve hızlı iyileşme.',
  seo_title = 'Full Endoskopik Bel Fıtığı Ameliyatı | Op. Dr. Eyüp Baykara',
  seo_description = 'Bel fıtığında full endoskopik kapalı ameliyat: küçük kesi, az doku hasarı ve hızlı iyileşme. Sırt ağrısı, bacak uyuşması ve güç kaybına minimal invaziv çözüm.'
where slug = '/tedaviler/bel-fitigi-ameliyati';

update public.content_pages
set
  excerpt = 'Boyun ağrısı, kol uyuşması ve baş dönmesinde full endoskopik kapalı tedavi.',
  seo_title = 'Full Endoskopik Boyun Fıtığı Ameliyatı | Op. Dr. Eyüp Baykara',
  seo_description = 'Boyun fıtığında full endoskopik kapalı ameliyat. Boyun ağrısı, kol uyuşması ve baş dönmesine minimal invaziv tedavi; hızlı iyileşme, küçük kesi.'
where slug = '/tedaviler/boyun-fitigi-ameliyati';

update public.content_pages
set
  excerpt = 'Kanal darlığında ağrı, uyuşma ve güç kaybına minimal invaziv çözüm.',
  seo_title = 'Full Endoskopik Kanal Darlığı Ameliyatı | Op. Dr. Eyüp Baykara',
  seo_description = 'Full endoskopik tam kapalı kanal darlığı ameliyatı: ağrı, uyuşma ve güç kaybına minimal invaziv çözüm. Hızlı iyileşme, daha az komplikasyon riski.'
where slug = '/tedaviler/kanal-darligi-ameliyati';
