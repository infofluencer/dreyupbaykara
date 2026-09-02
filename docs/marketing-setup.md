# Marketing API — Faz 1 Kurulum

Google Ads + Meta harcama sync ve `/admin/marketing` dashboard.

## 1. Migration

Supabase SQL Editor veya `npx supabase db push`:

```text
supabase/migrations/20260901180000_marketing_api.sql
```

## 2. Env

`.env.example` → `.env.local` — şunları doldurun:

| Değişken | Açıklama |
|----------|----------|
| `GOOGLE_ADS_CLIENT_ID` | Google Cloud OAuth client |
| `GOOGLE_ADS_CLIENT_SECRET` | OAuth secret |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads API developer token |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | MCC veya hesap ID (rakamlar) |
| `META_APP_ID` | Meta uygulama ID |
| `META_APP_SECRET` | Meta app secret |
| `META_AD_ACCOUNT_ID` | Reklam hesabı (`act_` olmadan) |
| `CRON_SECRET` | Cron endpoint koruması |
| `MARKETING_OAUTH_REDIRECT_BASE` | Opsiyonel; prod URL (OAuth redirect) |
| `GOOGLE_ADS_REFRESH_TOKEN` | Kalıcı Google token (script veya bir kez OAuth) |
| `GOOGLE_ADS_CUSTOMER_IDS` | MCC altı hesap ID'leri (virgülle) |
| `META_ACCESS_TOKEN` | Meta long-lived veya System User token |

**Kalıcı bağlantı (önerilen):** Token'ları env'e yazın; cron her seferinde `ad_accounts`'a bootstrap eder. Site OAuth akışı şart değil.

### Token alma (canlı — önerilen)

1. Dokploy env (refresh token hariç):
   - Google: `GOOGLE_ADS_CLIENT_ID`, `CLIENT_SECRET`, `DEVELOPER_TOKEN`, `LOGIN_CUSTOMER_ID`, `CUSTOMER_IDS`
   - Meta: `META_APP_ID`, `META_APP_SECRET`, `META_AD_ACCOUNT_ID`
   - `MARKETING_OAUTH_REDIRECT_BASE=https://endoskopikbelameliyati.com`

2. Redirect URI (Google Cloud + Meta App):
   ```text
   https://endoskopikbelameliyati.com/api/marketing/oauth/google/callback
   https://endoskopikbelameliyati.com/api/marketing/oauth/meta/callback
   ```

3. Admin → `/admin/marketing/connect` → **Google/Meta bağla (OAuth)**  
   veya terminal:
   ```bash
   npm run marketing:tokens prod google
   npm run marketing:tokens prod meta
   ```

4. Başarılı olunca sayfada `GOOGLE_ADS_REFRESH_TOKEN` / `META_ACCESS_TOKEN` satırı çıkar → Dokploy'a yapıştır → redeploy.

### Token alma (local script)

Redirect URI: `http://127.0.0.1:8765/callback`

```bash
npm run marketing:tokens google
npm run marketing:tokens meta
```

## 3. OAuth redirect URI'leri

Google Cloud Console → OAuth client → Authorized redirect URIs:

```text
https://ALAN-ADINIZ/api/marketing/oauth/google/callback
```

Meta App → Facebook Login → Valid OAuth Redirect URIs:

```text
https://ALAN-ADINIZ/api/marketing/oauth/meta/callback
```

Yerel geliştirme:

```text
http://localhost:3005/api/marketing/oauth/google/callback
http://localhost:3005/api/marketing/oauth/meta/callback
```

## 4. Hesap bağlama

1. `/admin/marketing/connect` açın
2. **Google Ads bağla** → offline refresh token istenir (`prompt=consent`)
3. **Meta bağla** → long-lived token otomatik exchange edilir

## 5. Site prefix map

Kampanya adı formatı: `[BEL] Kampanya açıklaması`

`/admin/marketing/connect` → Site prefix haritası bölümünden yeni prefix ekleyin.

Seed: `BEL` → `endoskopikbelameliyati`

Manuel eşleşme: `/admin/marketing` → Eşleşmemiş kampanyalar

## 6. Cron sync

Vercel (`vercel.json`): günde 06:00 ve 18:00 UTC — son 7 gün rolling sync.

Manuel tetikleme:

```bash
curl -X POST https://ALAN-ADINIZ/api/cron/marketing-sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

Sync sırası: kampanyalar → günlük metrikler.

## 7. Dashboard

- `/admin/marketing` — harcama, lead, CPL, grafikler, kampanya tablosu
- `/admin` özet — bu ay spend/CPL kartı (veri varsa)

## 8. Test

```bash
npm run test:site-matcher
```

## Notlar

- Tüm siteler tek Google/Meta hesabında → site ayrımı kampanya prefix veya manuel atama ile.
- Manuel site atamaları sync tarafından ezilmez (`site_match_source=manual`).
- Token süresi dolunca hesap `is_active=false` olur; dashboard uyarı gösterir.
- `conversion_events` tablosu Faz 3 için hazır; henüz doldurulmuyor.
