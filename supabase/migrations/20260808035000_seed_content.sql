-- Initial editable page records. Existing static content remains as fallback.
-- Safe to run once after the CMS migration.

insert into public.content_pages (
  slug,
  page_type,
  title,
  excerpt,
  status,
  featured_image_path,
  featured_image_alt,
  seo_title,
  seo_description,
  published_at
)
values
  (
    '/',
    'home',
    'Op. Dr. Eyüp Baykara',
    'Full endoskopik omurga cerrahisi: bel fıtığı, boyun fıtığı ve kanal darlığında hızlı iyileşme.',
    'published',
    'legacy/hero/hero_dr.webp',
    'Op. Dr. Eyüp Baykara',
    'Op. Dr. Eyüp Baykara | Beyin ve Sinir Cerrahisi Uzmanı',
    'Full endoskopik bel fıtığı, boyun fıtığı ve kanal darlığı ameliyatı. Minimal invaziv omurga cerrahisi — Op. Dr. Eyüp Baykara, Silivri / İstanbul.',
    now()
  ),
  (
    '/hakkimizda',
    'page',
    'Op. Dr. Eyüp Baykara',
    'Beyin ve sinir cerrahisi uzmanı. Full endoskopik, minimal invaziv omurga cerrahisinde deneyimli.',
    'published',
    'legacy/hero/hero_dr.webp',
    'Op. Dr. Eyüp Baykara',
    'Hakkımızda | Op. Dr. Eyüp Baykara',
    'Op. Dr. Eyüp Baykara, beyin ve sinir cerrahisi uzmanı. Full endoskopik bel, boyun fıtığı ve kanal darlığı cerrahisinde deneyimli yaklaşım.',
    now()
  ),
  (
    '/iletisim',
    'page',
    'Bize Ulaşın',
    'Randevu ve sorularınız için telefon, WhatsApp veya e-posta ile bize ulaşabilirsiniz.',
    'published',
    null,
    null,
    'İletişim | Op. Dr. Eyüp Baykara',
    'Randevu ve iletişim: Özel Silivri Anadolu Hastanesi. Telefon 0530 783 72 24, WhatsApp veya e-posta ile ulaşın.',
    now()
  ),
  (
    '/hasta-deneyimleri',
    'experience',
    'Hasta Deneyimleri',
    'Ameliyat sonrası videolar ve gerçek hasta yorumları — iyileşme hikâyelerini yakından görün.',
    'published',
    'legacy/hero/instagram/reel-DYpmtdTBQrc.jpg',
    'Hasta deneyimi videosu',
    'Hasta Deneyimleri | Op. Dr. Eyüp Baykara',
    'Full endoskopik ameliyat sonrası hasta videoları ve gerçek yorumlar. Bel fıtığı, boyun fıtığı ve kanal darlığı iyileşme hikâyeleri.',
    now()
  ),
  (
    '/tedaviler/bel-fitigi-ameliyati',
    'treatment',
    'Full Endoskopik Tam Kapalı Bel Fıtığı Ameliyatı',
    'Disk kaymasıyla oluşan bel fıtığında küçük kesi, az doku hasarı ve hızlı iyileşme.',
    'published',
    'legacy/hero/belfitigi.webp',
    'Full endoskopik bel fıtığı ameliyatı',
    'Full Endoskopik Bel Fıtığı Ameliyatı | Op. Dr. Eyüp Baykara',
    'Bel fıtığında full endoskopik kapalı ameliyat: küçük kesi, az doku hasarı ve hızlı iyileşme. Sırt ağrısı, bacak uyuşması ve güç kaybına minimal invaziv çözüm.',
    now()
  ),
  (
    '/tedaviler/boyun-fitigi-ameliyati',
    'treatment',
    'Full Endoskopik Tam Kapalı Boyun Fıtığı Ameliyatı',
    'Boyun ağrısı, kol uyuşması ve baş dönmesinde full endoskopik kapalı tedavi.',
    'published',
    'legacy/hero/boyunfitigi.webp',
    'Full endoskopik boyun fıtığı ameliyatı',
    'Full Endoskopik Boyun Fıtığı Ameliyatı | Op. Dr. Eyüp Baykara',
    'Boyun fıtığında full endoskopik kapalı ameliyat. Boyun ağrısı, kol uyuşması ve baş dönmesine minimal invaziv tedavi; hızlı iyileşme, küçük kesi.',
    now()
  ),
  (
    '/tedaviler/kanal-darligi-ameliyati',
    'treatment',
    'Full Endoskopik Tam Kapalı Kanal Darlığı Ameliyatı',
    'Kanal darlığında ağrı, uyuşma ve güç kaybına minimal invaziv çözüm.',
    'published',
    'legacy/hero/kanaldarligi.webp',
    'Full endoskopik kanal darlığı ameliyatı',
    'Full Endoskopik Kanal Darlığı Ameliyatı | Op. Dr. Eyüp Baykara',
    'Full endoskopik tam kapalı kanal darlığı ameliyatı: ağrı, uyuşma ve güç kaybına minimal invaziv çözüm. Hızlı iyileşme, daha az komplikasyon riski.',
    now()
  ),
  (
    '/blog',
    'page',
    'Sağlık Rehberi',
    'Omurga sağlığı, fıtık ve endoskopik cerrahi hakkında güncel yazılar.',
    'published',
    null,
    null,
    'Blog | Op. Dr. Eyüp Baykara',
    'Bel fıtığı, boyun fıtığı ve kanal darlığı hakkında bilgilendirici yazılar. Full endoskopik omurga cerrahisi rehberi.',
    now()
  )
on conflict (slug) do nothing;

insert into public.content_sections (
  page_id,
  section_key,
  section_type,
  title,
  content,
  sort_order,
  is_visible
)
select
  id,
  'doctor_bio',
  'text',
  'Uzmanlık ve yaklaşım',
  '{
    "paragraphs": [
      "Op. Dr. Eyüp Baykara, beyin ve sinir cerrahisi uzmanı olarak bel fıtığı, boyun fıtığı ve omurilik kanal darlığı tedavilerinde full endoskopik yöntemlere odaklanır.",
      "Tıp eğitimini Trakya Üniversitesi Tıp Fakültesinde, uzmanlık eğitimini Pamukkale Üniversitesi Beyin ve Sinir Cerrahisi Ana Bilim Dalında tamamlamıştır."
    ],
    "items": [
      "Full endoskopik bel fıtığı ameliyatı",
      "Full endoskopik boyun fıtığı ameliyatı",
      "Full endoskopik kanal darlığı ameliyatı",
      "Minimal invaziv omurga cerrahisi"
    ]
  }'::jsonb,
  10,
  true
from public.content_pages
where slug = '/hakkimizda'
on conflict (page_id, section_key) do nothing;

