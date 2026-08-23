/**
 * Meta Business Manager’da onaylanması gereken UTILITY şablonları.
 * Panel seed adları: randevu_1_gun | randevu_1_saat | ameliyat_gunu
 *
 * Dil: Turkish (tr)
 * Kategori: UTILITY
 * Body değişken sırası (include_body_params=true):
 *   {{1}} hasta adı
 *   {{2}} randevu/ameliyat tarihi (örn. 24.08.2026)
 *   {{3}} saat (örn. 09:30)
 *
 * Örnek metinler (Meta’da birebir onaylatın):
 *
 * randevu_1_gun:
 *   Merhaba {{1}}, yarın ({{2}}) saat {{3}} randevunuzu hatırlatmak isteriz.
 *   Op. Dr. Eyüp Baykara kliniği.
 *
 * randevu_1_saat:
 *   Merhaba {{1}}, bugün saat {{3}} randevunuz var ({{2}}).
 *   Op. Dr. Eyüp Baykara kliniği.
 *
 * ameliyat_gunu:
 *   Merhaba {{1}}, bugün ({{2}}) ameliyat/prosedür randevunuz saat {{3}}.
 *   Lütfen oruç/ilaç talimatlarına uyun. Op. Dr. Eyüp Baykara kliniği.
 *
 * Onay sonrası /admin/automations’da template adını doğrulayıp kuralı açın.
 * Kurallar varsayılan olarak kapalıdır (KVKK / açık rıza).
 */
export const WA_AUTOMATION_TEMPLATE_SPECS = [
  {
    key: "appt_1d",
    templateName: "randevu_1_gun",
    bodyParams: ["name", "date", "time"] as const,
  },
  {
    key: "appt_1h",
    templateName: "randevu_1_saat",
    bodyParams: ["name", "date", "time"] as const,
  },
  {
    key: "surgery_day",
    templateName: "ameliyat_gunu",
    bodyParams: ["name", "date", "time"] as const,
  },
] as const;
