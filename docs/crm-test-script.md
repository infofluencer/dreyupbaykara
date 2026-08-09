# CRM / Takvim test scripti

Terminal:

```bash
npm run test:crm
npm run test:sources
```

Canlı site ayaktaysa:

```bash
BASE_URL=https://ALAN-ADINIZ npm run test:crm
```

Script canlı Supabase’e bağlanır: şema, hasta kimliği, not, 1 saat muayene, 3 saat ameliyat, çakışma, temizlik.

---

Elle tarayıcı kontrolü: `/admin` (veya canlı domain `/admin`)  
Hesap: `admin` / `doctor` / `assistant` rolünden biri  
Önkoşul: Supabase SQL Editor’da **tüm migration’lar** çalışmış olsun, özellikle:

- `20260808041000_calendar_enhancements.sql`
- `20260808160000_patients.sql`
- `20260808180000_appointment_no_overlap.sql`

WhatsApp env boşsa inbox/bot/hatırlatma adımlarını atlayın.

---

## A. Giriş ve menü

1. `/admin/login` → giriş yap.
2. Sidebar’da **Takvim** ve **Hastalar** görünsün.
3. `/admin` özetinde Hasta / Bugünkü randevu kartları sayı göstersin (hata olmasın).
4. Yetkisiz role ile (ör. sadece `editor`) `/admin/leads` açılmasın → özet veya yetkisiz.

---

## B. Hasta kimliği

1. **Hastalar → Yeni hasta**
   - Ad, telefon zorunlu.
   - TC, doğum tarihi, şehir, alerji, klinik özet, ilk not doldur.
   - Kaydet → hasta kartı açılsın, hasta no `HST-00xx` görünsün.
2. Aynı telefonla tekrar yeni hasta dene → mevcut kimliğe gitsin, çift kayıt olmasın.
3. Kimlikte ad/telefon/özet değiştir → **Kimliği kaydet**.
4. Not ekle: Klinik / Ameliyat / Kontrol / İdari.
5. Bir notu **Sil** (onay kutusu çıksın).
6. Listede ad / telefon / TC / hasta no ile ara.
7. Karttan **Takvime randevu yaz** → Takvim açılsın, hasta seçili gelsin.

---

## C. Takvim — randevu ekle / sil

### C1. Kayıtlı hasta
1. Takvim → **Gün**, tarihi **Bugün** yap.
2. Kayıtlı hasta seç (ör. Yusuf).
   - Ad + telefon **otomatik dolsun ve kilitli** olsun.
3. Tür: İlk muayene. Süre: 1 saat.
4. Boş bir saat seç (ör. 11:00) → **Randevu ekle**.
5. Gün tablosunda `11:00–12:00` + isim + süre görünsün.
6. 11:30 dilimi **Dolu / devam** yazsın (boş olmasın).

### C2. Yeni hasta (takvimden)
1. Kayıtlı hasta: **Yeni hasta**.
2. Ad + telefon elle yazılsın (kilitli olmasın).
3. 14:00, 30 dk kontrol → ekle.
4. **Hastalar** listesinde bu kişi görünsün.

### C3. Ameliyat süresi
1. Tür: **Ameliyat** → süre otomatik **3 saat** olsun.
2. 09:00’a 3 saat ameliyat yaz.
3. 09:00–11:30 arası dolu görünsün.
4. Aynı güne 10:00’a muayene yazmayı dene → kırmızı uyarı:
   `Bu saat dolu: 09:00–12:00 · …`
   Sayfa **çökmesin**.

### C4. Silme
1. Gün satırından **Sil** → onay → randevu kalksın, saat boşalsın.
2. Randevu **Detay** → **Randevuyu sil** → Takvim’e dönsün.

---

## D. Görünümler (gün / hafta / ay / yıl)

1. **Hafta**: tam gün adı + tarih + saat aralığı + süre.
2. Haftada güne tıkla → gün görünümü o tarihe geçsin. “Bugün” yazısı sadece gerçek bugün için.
3. **Ay**: Pazartesi…Pazar tam ad, hücrede saat + isim + telefon.
4. Alt listedeki randevuya **Detay** / **Hasta**.
5. **Yıl**: 12 ay, randevu sayısı, **Ayı aç**.
6. ← → ve **Bugün** doğru tarih atsın (İstanbul, yaz saati kayması olmasın).

---

## E. Randevu detayı

1. Takvimden **Detay**.
2. Sadece bu randevu: başlangıç, tür, süre, durum, not.
3. Süreyi 2 saat yap → kaydet → gün tablosu uzasın.
4. **Hasta kimliği** → hasta kartı.
5. Hasta kartındaki **Takvim randevuları** listesinde bu saat görünsün.

---

## F. Çakışma ve kenar durumlar

| Senaryo | Beklenen |
|---|---|
| Aynı başlangıç, ikinci randevu | Form üstünde dolu uyarısı |
| 09:00–12:00 ameliyat + 11:30 muayene | Dolu uyarısı |
| 09:00–09:30 + 09:30–10:00 | İkisi de kabul (bitiş = sonraki başlangıç) |
| İptal edilmiş randevu | Saat tekrar boş, çakışma sayılmasın |
| Kayıtlı hasta seçip ad değiştirmeye çalışma | Alan kilitli |

---

## G. Site tarafı (isteğe bağlı)

1. `http://localhost:3005/r?utm_source=test&utm_campaign=demo`  
   WhatsApp açılır, `lead_sources`’a kayıt düşer.
2. CMS / medya: içerik kaydet, görsel görünsün.

**Atla (env boş):** WhatsApp inbox gönderimi, bot, cron hatırlatma.

---

## H. Canlıya alma öncesi

1. VPS’te `.env` içine aynı Supabase URL + anon + service role.
2. `NEXT_PUBLIC_SITE_URL=https://ALAN-ADINIZ`
3. `npm run build` hatasız bitsin.
4. `/admin` HTTPS + login çalışsın.
5. Yukarıdaki B–F’yi canlıda bir kez tekrarla.

WhatsApp canlıya alınacaksa ayrıca: Cloud API env, webhook, `CRON_SECRET`.

---

## Sonuç kutusu (işaretle)

- [ ] Hasta oluştur / not / kimlik
- [ ] Takvimden kayıtlı hasta kilitli doldu
- [ ] Muayene + ameliyat süreleri doğru
- [ ] Dolu saat uyarısı (sayfa düşmedi)
- [ ] Silme çalışıyor
- [ ] Gün / hafta / ay / yıl
- [ ] Hasta kartı ↔ takvim linkleri
- [ ] (Canlı) build + `/admin` giriş
