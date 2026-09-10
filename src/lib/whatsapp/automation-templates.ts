/**
 * Otomatik serbest (text) mesaj içerikleri.
 *   appt_1d | appt_1h | surgery_day | surgery_google_review
 *
 * Dil: Turkish (tr)
 *
 * appt_1d / appt_1h — body değişkenleri:
 *   {{1}} hasta adı · {{2}} tarih · {{3}} saat
 *
 * surgery_day / surgery_google_review — sabit metin (değişken yok).
 *
 * Gönderim yalnızca WhatsApp 24s serbest penceresi açıkken yapılır.
 * Kurallar varsayılan kapalıdır (KVKK / açık rıza).
 */

export const GOOGLE_MAPS_REVIEW_URL =
  "https://www.google.com/maps/search/?api=1&query=Op.+Dr.+Ey%C3%BCp+Baykara";

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
Op. Dr. Eyüp Baykara.`;

export const WA_AUTOMATION_TEMPLATE_SPECS = [
  {
    key: "appt_1d",
    templateName: "randevu_1_gun",
    bodyParams: ["name", "date", "time"] as const,
    sampleBody:
      "Merhaba {{1}}, yarın ({{2}}) saat {{3}} randevunuzu hatırlatmak isteriz. Op. Dr. Eyüp Baykara.",
  },
  {
    key: "appt_1h",
    templateName: "randevu_1_saat",
    bodyParams: ["name", "date", "time"] as const,
    sampleBody:
      "Merhaba {{1}}, bugün saat {{3}} randevunuz var ({{2}}). Op. Dr. Eyüp Baykara.",
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

${GOOGLE_MAPS_REVIEW_URL}

Linke tıkladıktan sonra yorumlar kısmına girerek yazabilirsiniz 🙏`,
  },
] as const;

/** Bu kural yalnızca önceki kural başarıyla gönderildiyse çalışır. */
const AUTOMATION_RULE_REQUIRES_PRIOR_MAP: Partial<
  Record<(typeof WA_AUTOMATION_TEMPLATE_SPECS)[number]["key"], string>
> = {
  surgery_google_review: "surgery_day",
};

export function priorAutomationRuleKey(ruleKey: string): string | undefined {
  return AUTOMATION_RULE_REQUIRES_PRIOR_MAP[
    ruleKey as keyof typeof AUTOMATION_RULE_REQUIRES_PRIOR_MAP
  ];
}

export function automationSampleBody(ruleKey: string): string | null {
  return (
    WA_AUTOMATION_TEMPLATE_SPECS.find((s) => s.key === ruleKey)?.sampleBody ??
    null
  );
}

const TIME_ZONE = "Europe/Istanbul";

/** Kural anahtarına göre gönderilecek serbest mesaj metni. */
export function resolveAutomationMessageBody(
  ruleKey: string,
  contactName: string | null | undefined,
  startsAt: string,
): string | null {
  const sample = automationSampleBody(ruleKey);
  if (!sample) return null;

  const name = (contactName ?? "").trim() || "Değerli hastamız";
  const dateLabel = new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(startsAt));
  const timeLabel = new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));

  return sample
    .replaceAll("{{1}}", name)
    .replaceAll("{{2}}", dateLabel)
    .replaceAll("{{3}}", timeLabel);
}
