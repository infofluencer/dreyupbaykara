# Hasta Talep CRM (Admin)

Path: `/admin` · DB: Supabase · WhatsApp: Cloud API (sonraki sprint)

## Kurulum

1. [Supabase](https://supabase.com) projesi oluşturun.
2. `.env.example` → `.env.local` kopyalayın; URL + anon key + service role doldurun.
3. Supabase SQL Editor’da sırayla çalıştırın:
   - `supabase/migrations/20260807180000_crm_init.sql`
   - `supabase/migrations/20260807181500_lead_sources.sql`
   - `supabase/migrations/20260808030000_cms.sql`
   - `supabase/migrations/20260808034500_operations.sql`
   - `supabase/migrations/20260808035000_seed_content.sql`
   - `supabase/migrations/20260808041000_calendar_enhancements.sql`
   - `supabase/migrations/20260808160000_patients.sql`
4. Authentication → Users → Add user (email/password).
   Ardından Table Editor → `profiles` tablosunda kullanıcının `role`
   değerini `admin` yapın.
5. `npm run dev` → [http://localhost:3005/admin](http://localhost:3005/admin)

## CMS ve medya

Üçüncü migration şunları oluşturur:

- `content_pages`, `content_sections`, `content_revisions`
- `media_assets`, `site_settings`
- Public `site-media` Storage bucket (10 MB görsel sınırı)
- Admin, editör ve ajans için içerik/medya RLS politikaları

Yönetim ekranları:

- `/admin/content`: sayfa, SEO ve güvenli içerik bölümleri
- `/admin/content/settings`: telefon, e-posta ve klinik
- `/admin/media`: Supabase Storage görsel yönetimi
- Mevcut `public` görsellerini medya kütüphanesine almak için:
  `node scripts/import-site-media.mjs`
  veya `/admin/media` içindeki “Var olan fotoğrafları aktar” butonu
- `/admin/patients`: hasta kimliği, klinik notlar ve dosya
- `/admin/leads`: takvim (randevu ekle / sil)
- `/admin/calendar`: randevu detayı
- `/admin/inbox`: WhatsApp konuşmaları
- `/admin/bot`: mesai dışı ve SSS otomatik cevapları

## UTM / kaynak takibi

Site WhatsApp butonları `/r` üzerinden geçer.

Örnek: `/r?site=endoskopikbelameliyati&utm_source=google&utm_campaign=bel&gclid=...`

1. `lead_sources` tablosuna kayıt + kısa `lead_ref` üretilir  
2. WhatsApp açılır; mesajda `Ref: XXXXXX` bulunur  
3. (Sonraki sprint) Webhook ilk mesajdaki Ref ile lead’e bağlar  

Test: `http://localhost:3005/r?utm_source=test&utm_campaign=demo`

## Sonraki adımlar

- Diğer 3 site CTA’larını aynı `/r` endpoint’ine bağlama

## WhatsApp Cloud API

`.env.local` ve üretim ortamına şunları ekleyin:

```env
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_GRAPH_API_VERSION=
WHATSAPP_APPOINTMENT_TEMPLATE=
CRON_SECRET=
```

Meta webhook:

```text
https://ALAN-ADINIZ/api/whatsapp/webhook
```

Abonelik alanları: `messages` ve Coexistence kullanılıyorsa
`smb_message_echoes`. Verify token, env’deki
`WHATSAPP_VERIFY_TOKEN` ile aynı olmalıdır. POST webhook istekleri
`X-Hub-Signature-256` ve App Secret ile doğrulanır.

Cloud API bilgileri girilmeden inbox geçmiş veriyi gösterir fakat mesaj
gönderemez; webhook da gelen mesaj alamaz.

### Randevu hatırlatması

Meta’da değişkensiz, Türkçe bir randevu hatırlatma şablonu onaylatın ve adını
`WHATSAPP_APPOINTMENT_TEMPLATE` olarak girin. VPS cron servisi aşağıdaki
endpoint’i saatte bir çağırmalıdır:

```text
POST https://ALAN-ADINIZ/api/cron/reminders
Authorization: Bearer <CRON_SECRET>
```

Endpoint yaklaşık 24 saat sonraki planlanmış/onaylanmış randevulara şablon
gönderir ve `reminder_sent_at` alanıyla tekrar gönderimi önler. Açık iletişim
izni ve KVKK süreci doğrulanmadan bu cron etkinleştirilmemelidir.
