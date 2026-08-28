/**
 * Meta’da onaylanması gereken 4 UTILITY şablon:
 *   randevu_1_gun | randevu_1_saat | ameliyat_sonrasi_bilgi | google_maps_yorum
 *
 * Dil: Turkish (tr)
 *
 * randevu_1_gun / randevu_1_saat — body değişkenleri:
 *   {{1}} hasta adı · {{2}} tarih · {{3}} saat
 *
 * ameliyat_sonrasi_bilgi / google_maps_yorum — sabit metin (değişken yok).
 * google_maps_yorum: Meta’da URL düğmesi ekleyin (Web sitesini ziyaret et).
 *
 * Onay sonrası /admin/automations’da şablon adını doğrulayıp kuralı açın.
 * Kurallar varsayılan kapalıdır (KVKK / açık rıza).
 */

export const POSTOP_BILGILENDIRME_BODY = `BİLGİLENDİRME
İlk 10 gün;
•Uzun süre oturmak yasak (tek seferde max 30 dakika)
•Merdiven inip çıkmak serbest.
•Tek seferde 30 dkdan fazla yürümemeye dikkat edelim, kendimizi zorlamayalım.
•Yolda giderken dik oturarak gidebiliriz; uzak yere araçla giderken 2 saatte bir mola verip 5-10 dk yürüyün.
•10. günde kontrole gelin; gelemezseniz bize bildirim yazın.
•Eve gidince bandajı açıp duş alabilirsiniz, tekrar pansuman yok.

•10. günden sonra günlük yaşantınıza / işinize dönebilirsiniz.
•10. günden sonra yürüme kısıtlaması yok; bir anda yüklenmeden istediğiniz kadar yürüyebilirsiniz.
•30 günden sonra fizik tedavi doktorunun önerdiği bel egzersizlerini yapabilirsiniz.
•Yerden bir şey alırken eğilmek yasak, çömelerek alın.
•Eğilerek süpürme yasak; kolları kullanarak yapın.
•Çamaşır atarken/alırken eğilmeyin; tabureye oturarak yapın.
•Temel mantık: bele dengesiz yük bindirmemek.

Reçetedeki ilaçları bitene kadar kullanın.
Op. Dr. Eyüp Baykara kliniği.`;

export const WA_AUTOMATION_TEMPLATE_SPECS = [
  {
    key: "appt_1d",
    templateName: "randevu_1_gun",
    bodyParams: ["name", "date", "time"] as const,
    sampleBody:
      "Merhaba {{1}}, yarın ({{2}}) saat {{3}} randevunuzu hatırlatmak isteriz. Op. Dr. Eyüp Baykara kliniği.",
  },
  {
    key: "appt_1h",
    templateName: "randevu_1_saat",
    bodyParams: ["name", "date", "time"] as const,
    sampleBody:
      "Merhaba {{1}}, bugün saat {{3}} randevunuz var ({{2}}). Op. Dr. Eyüp Baykara kliniği.",
  },
  {
    key: "surgery_day",
    templateName: "ameliyat_sonrasi_bilgi",
    bodyParams: [] as const,
    sampleBody: POSTOP_BILGILENDIRME_BODY,
  },
  {
    key: "surgery_google_review",
    templateName: "google_maps_yorum",
    bodyParams: [] as const,
    sampleBody: `Attığım linke yorumlarınızı bekliyoruz mutlaka.

Linke tıkladıktan sonra yorumlar kısmına girerek yazabilirsiniz 🙏`,
  },
] as const;

/** Bu kural yalnızca önceki kural başarıyla gönderildiyse çalışır. */
export const AUTOMATION_RULE_REQUIRES_PRIOR: Partial<
  Record<(typeof WA_AUTOMATION_TEMPLATE_SPECS)[number]["key"], string>
> = {
  surgery_google_review: "surgery_day",
};

export function automationSampleBody(ruleKey: string): string | null {
  return (
    WA_AUTOMATION_TEMPLATE_SPECS.find((s) => s.key === ruleKey)?.sampleBody ??
    null
  );
}
