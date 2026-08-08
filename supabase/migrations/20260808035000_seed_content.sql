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
    'Full endoskopik omurga cerrahisi ve hasta bilgilendirme.',
    'published',
    'legacy/hero/hero_dr.webp',
    'Op. Dr. Eyüp Baykara',
    'Op. Dr. Eyüp Baykara | Beyin ve Sinir Cerrahisi Uzmanı',
    'Full endoskopik tam kapalı bel fıtığı ameliyatı ve minimal invaziv beyin ve omurga cerrahisi.',
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
    'Op. Dr. Eyüp Baykara — full endoskopik omurga cerrahisi uzmanı.',
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
    'Randevu ve iletişim bilgileri.',
    now()
  ),
  (
    '/hasta-deneyimleri',
    'experience',
    'Hasta Deneyimleri',
    'Ameliyat sonrası videolar ve gerçek hasta yorumları.',
    'published',
    'legacy/hero/instagram/reel-DYpmtdTBQrc.jpg',
    'Hasta deneyimi videosu',
    'Hasta Deneyimleri | Op. Dr. Eyüp Baykara',
    'Full endoskopik ameliyat sonrası hasta videoları ve yorumları.',
    now()
  ),
  (
    '/tedaviler/bel-fitigi-ameliyati',
    'treatment',
    'Full Endoskopik Tam Kapalı Bel Fıtığı Ameliyatı',
    'Kalçadan bacağa vuran ağrıya yönelik minimal invaziv yaklaşım.',
    'published',
    'legacy/hero/belfitigi.webp',
    'Full endoskopik bel fıtığı ameliyatı',
    'Bel Fıtığı Ameliyatı | Op. Dr. Eyüp Baykara',
    'Full endoskopik tam kapalı bel fıtığı ameliyatı.',
    now()
  ),
  (
    '/tedaviler/boyun-fitigi-ameliyati',
    'treatment',
    'Full Endoskopik Tam Kapalı Boyun Fıtığı Ameliyatı',
    'Boyun ve kola yayılan şikâyetlere yönelik minimal invaziv yaklaşım.',
    'published',
    'legacy/hero/boyunfitigi.webp',
    'Full endoskopik boyun fıtığı ameliyatı',
    'Boyun Fıtığı Ameliyatı | Op. Dr. Eyüp Baykara',
    'Full endoskopik tam kapalı boyun fıtığı ameliyatı.',
    now()
  ),
  (
    '/tedaviler/kanal-darligi-ameliyati',
    'treatment',
    'Full Endoskopik Tam Kapalı Kanal Darlığı Ameliyatı',
    'Kanal darlığında sinir baskısını azaltmaya yönelik endoskopik yaklaşım.',
    'published',
    'legacy/hero/kanaldarligi.webp',
    'Full endoskopik kanal darlığı ameliyatı',
    'Kanal Darlığı Ameliyatı | Op. Dr. Eyüp Baykara',
    'Full endoskopik kanal darlığı ameliyatı.',
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
    'Bel fıtığı, boyun fıtığı ve kanal darlığı hakkında bilgilendirici yazılar.',
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

