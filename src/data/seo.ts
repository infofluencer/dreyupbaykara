export type PageSeo = {
  title: string;
  description: string;
  snippet: string;
};

/** Canonical marketing SEO: meta title, meta description, snippet (kısa açıklama). */
export const PAGE_SEO = {
  home: {
    title: "Endoskopik Bel Ameliyatı | Op. Dr. Eyüp Baykara",
    description:
      "Full endoskopik bel fıtığı, boyun fıtığı ve kanal darlığı ameliyatı. Minimal invaziv, aynı gün taburcu — Op. Dr. Eyüp Baykara, Silivri / İstanbul.",
    snippet:
      "Full endoskopik omurga cerrahisi: bel fıtığı, boyun fıtığı ve kanal darlığında hızlı iyileşme.",
  },
  hakkimizda: {
    title: "Op. Dr. Eyüp Baykara Kimdir? | Beyin ve Sinir Cerrahisi",
    description:
      "Op. Dr. Eyüp Baykara — full endoskopik bel, boyun fıtığı ve kanal darlığı cerrahisinde uzman beyin ve sinir cerrahı. Silivri / İstanbul.",
    snippet:
      "Beyin ve sinir cerrahisi uzmanı. Full endoskopik, minimal invaziv omurga cerrahisinde deneyimli.",
  },
  iletisim: {
    title: "Randevu ve İletişim | Op. Dr. Eyüp Baykara",
    description:
      "Endoskopik bel fıtığı randevusu: Özel Silivri Anadolu Hastanesi. Tel 0530 783 72 24 — WhatsApp veya e-posta ile ulaşın.",
    snippet:
      "Randevu ve sorularınız için telefon, WhatsApp veya e-posta ile bize ulaşabilirsiniz.",
  },
  hastaDeneyimleri: {
    title: "Hasta Deneyimleri ve Yorumlar | Op. Dr. Eyüp Baykara",
    description:
      "Full endoskopik bel fıtığı ve kanal darlığı ameliyatı sonrası hasta videoları, Google yorumları ve gerçek iyileşme hikâyeleri.",
    snippet:
      "Ameliyat sonrası videolar ve gerçek hasta yorumları — iyileşme hikâyelerini yakından görün.",
  },
  blog: {
    title: "Bel Fıtığı ve Endoskopik Cerrahi Blog | Op. Dr. Eyüp Baykara",
    description:
      "Bel fıtığı, siyatik, boyun fıtığı ve kanal darlığı hakkında bilgilendirici yazılar. Full endoskopik omurga cerrahisi rehberi.",
    snippet:
      "Omurga sağlığı, fıtık ve endoskopik cerrahi hakkında güncel yazılar.",
  },
  hizmetler: {
    title: "Endoskopik Omurga Tedavileri | Op. Dr. Eyüp Baykara",
    description:
      "Full endoskopik bel fıtığı, boyun fıtığı ve kanal darlığı ameliyatı. Minimal invaziv omurga tedavileri — Silivri / İstanbul.",
    snippet:
      "Bel fıtığı, boyun fıtığı ve kanal darlığında full endoskopik tedavi seçenekleri.",
  },
  cerezler: {
    title: "Çerez Politikası | Op. Dr. Eyüp Baykara",
    description:
      "Op. Dr. Eyüp Baykara web sitesinde kullanılan çerezler, KVKK/GDPR uyumlu kategori bazlı onay ve tercihlerinizi nasıl yöneteceğiniz.",
    snippet:
      "KVKK ve GDPR kapsamında çerezleri kategori bazlı yönetebilirsiniz. Zorunlu çerezler her zaman aktiftir; diğerleri yalnızca onayınızla çalışır.",
  },
} as const satisfies Record<string, PageSeo>;

export const SITE_KEYWORDS = [
  "endoskopik bel ameliyatı",
  "full endoskopik bel fıtığı ameliyatı",
  "kapalı bel fıtığı ameliyatı",
  "bel fıtığı ameliyatı",
  "boyun fıtığı ameliyatı",
  "kanal darlığı ameliyatı",
  "Op. Dr. Eyüp Baykara",
  "endoskopik omurga cerrahisi",
  "Silivri beyin cerrahisi",
] as const;
