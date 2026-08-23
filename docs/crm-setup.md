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
   - `supabase/migrations/20260808180000_appointment_no_overlap.sql`
   - `supabase/migrations/20260817120000_whatsapp_inbox_tracking.sql`
   - `supabase/migrations/20260818120000_lead_status_machine.sql`
   - `supabase/migrations/20260824120000_simplify_lead_statuses.sql` (4 durum)
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

- `/admin/content`: ana sayfa section metinleri + medya + iletişim ayarları (`?tab=media` / `?tab=settings`)
- Section iskeleti kodda sabittir; admin yalnızca metin / sayı / görsel yolunu değiştirir
- Mevcut `public` görsellerini medya kütüphanesine almak için:
  `node scripts/import-site-media.mjs`
  veya İçerik → Medya → “Var olan fotoğrafları aktar”
- `/admin/pipeline`: Durum Panosu — yeni / arandı / randevulu / bitti
- `/admin/patients`: hasta kimliği, klinik notlar ve dosya
- `/admin/leads`: takvim (randevu ekle / sil)
- `/admin/calendar`: randevu detayı
- `/admin/messages`: WhatsApp konuşmaları (günlük durum takibi burada)
- `/admin/bot`: mesai dışı ve SSS otomatik cevapları

## UTM / kaynak takibi

Google Ads (`gclid`, `utm_source=google`) ve Meta (`fbclid`, Facebook / Instagram UTM)
iki yerde kaydedilir:

1. **Sayfa inişi** — reklam URL’siyle siteye gelince `AttributionCapture` → `POST /api/track/landing` (`channel=landing`)
2. **WhatsApp / form** — CTA `/r` üzerinden geçer; `lead_ref` üretilir, `wa.me` açılır

Örnek Ads: `/?utm_source=google&utm_campaign=bel&gclid=...`  
Örnek Meta: `/?utm_source=facebook&fbclid=...`  
Örnek WA: `/r?site=endoskopikbelameliyati&utm_source=google&gclid=...`

Admin: `/admin/sources` — Google Ads / Meta / Organik ve Sayfa inişi / WhatsApp / Form filtreleri.

WhatsApp webhook açıksa ilk mesajdaki `Ref: XXXXXX` lead’e bağlanır.

## Sonraki adımlar

- Diğer 3 site CTA’larını aynı `/r` endpoint’ine bağlama

## WhatsApp Cloud API

`.env.local` ve üretim ortamına şunları ekleyin:

```env
WHATSAPP_ENABLED=false
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_GRAPH_API_VERSION=
WHATSAPP_APPOINTMENT_TEMPLATE=
CRON_SECRET=
```

`WHATSAPP_ENABLED=false` iken webhook işlenmez; panelden gönderilen mesajlar
yalnızca veritabanına yazılır (UI testi). `true` yapmadan Cloud API POST
tamamlanmamalıdır.

Inbox UI: `/admin/messages` (eski `/admin/inbox` yönlendirilir).

Şema ekleri: `supabase/migrations/20260817120000_whatsapp_inbox_tracking.sql`
(conversations status / unread / preview; doktor RLS: yalnızca atanan).

Meta webhook:

```text
https://ALAN-ADINIZ/api/whatsapp/webhook
```

Abonelik alanları: `messages` ve Coexistence kullanılıyorsa
`smb_message_echoes`. Verify token, env’deki
`WHATSAPP_VERIFY_TOKEN` ile aynı olmalıdır. POST webhook istekleri
`X-Hub-Signature-256` ve App Secret ile doğrulanır.

Cloud API bilgileri girilmeden inbox geçmiş veriyi gösterir; gönderim DB’ye
kaydolur ama Meta’ya gitmez.

### Randevu / ameliyat hatırlatması (otomatik)

Meta’da üç UTILITY şablon onaylatın (Türkçe, body `{{1}}` ad, `{{2}}` tarih,
`{{3}}` saat):

| Seed adı | Kullanım |
|----------|----------|
| `randevu_1_gun` | Muayene vb. — 1 gün önce |
| `randevu_1_saat` | Muayene vb. — 1 saat önce |
| `ameliyat_gunu` | `procedure` — ameliyat günü ~08:00 Istanbul |

Panel: `/admin/automations` — kural aç/kapa, şablon adı, gönderim logu, opt-out.
Kurallar varsayılan **kapalıdır**. Migration:
`20260823200000_wa_message_automations.sql`.

Cron (15 dakika; Vercel `vercel.json` veya VPS):

```text
POST https://ALAN-ADINIZ/api/cron/reminders
Authorization: Bearer <CRON_SECRET>
```

Idempotency: `message_dispatches (appointment_id, rule_key)`. Opt-out:
`wa_message_opt_outs` veya hasta mesajı `DUR` / `STOP` / `IPTAL`.

Açık iletişim izni ve KVKK süreci doğrulanmadan kuralları açmayın / cron’u
canlıda çalıştırmayın.

Eski tek şablon env’si `WHATSAPP_APPOINTMENT_TEMPLATE` artık zorunlu değil;
adlar DB `message_rules.template_name` üzerinden gelir.
