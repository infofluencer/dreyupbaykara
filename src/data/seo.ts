export type PageSeo = {
  title: string;
  description: string;
  snippet: string;
};

/** Canonical marketing SEO: meta title, meta description, snippet (kısa açıklama). */
export const PAGE_SEO = {
  home: {
    title: "Op. Dr. Eyüp Baykara | Beyin ve Sinir Cerrahisi Uzmanı",
    description:
      "Full endoskopik bel fıtığı, boyun fıtığı ve kanal darlığı ameliyatı. Minimal invaziv omurga cerrahisi — Op. Dr. Eyüp Baykara, Silivri / İstanbul.",
    snippet:
      "Full endoskopik omurga cerrahisi: bel fıtığı, boyun fıtığı ve kanal darlığında hızlı iyileşme.",
  },
  hakkimizda: {
    title: "Hakkımızda | Op. Dr. Eyüp Baykara",
    description:
      "Op. Dr. Eyüp Baykara, beyin ve sinir cerrahisi uzmanı. Full endoskopik bel, boyun fıtığı ve kanal darlığı cerrahisinde deneyimli yaklaşım.",
    snippet:
      "Beyin ve sinir cerrahisi uzmanı. Full endoskopik, minimal invaziv omurga cerrahisinde deneyimli.",
  },
  iletisim: {
    title: "İletişim | Op. Dr. Eyüp Baykara",
    description:
      "Randevu ve iletişim: Özel Silivri Anadolu Hastanesi. Telefon 0530 783 72 24, WhatsApp veya e-posta ile ulaşın.",
    snippet:
      "Randevu ve sorularınız için telefon, WhatsApp veya e-posta ile bize ulaşabilirsiniz.",
  },
  hastaDeneyimleri: {
    title: "Hasta Deneyimleri | Op. Dr. Eyüp Baykara",
    description:
      "Full endoskopik ameliyat sonrası hasta videoları ve gerçek yorumlar. Bel fıtığı, boyun fıtığı ve kanal darlığı iyileşme hikâyeleri.",
    snippet:
      "Ameliyat sonrası videolar ve gerçek hasta yorumları — iyileşme hikâyelerini yakından görün.",
  },
  blog: {
    title: "Blog | Op. Dr. Eyüp Baykara",
    description:
      "Bel fıtığı, boyun fıtığı ve kanal darlığı hakkında bilgilendirici yazılar. Full endoskopik omurga cerrahisi rehberi.",
    snippet:
      "Omurga sağlığı, fıtık ve endoskopik cerrahi hakkında güncel yazılar.",
  },
  cerezler: {
    title: "Çerez Politikası | Op. Dr. Eyüp Baykara",
    description:
      "Op. Dr. Eyüp Baykara web sitesinde kullanılan çerezler, KVKK/GDPR uyumlu kategori bazlı onay ve tercihlerinizi nasıl yöneteceğiniz.",
    snippet:
      "KVKK ve GDPR kapsamında çerezleri kategori bazlı yönetebilirsiniz. Zorunlu çerezler her zaman aktiftir; diğerleri yalnızca onayınızla çalışır.",
  },
} as const satisfies Record<string, PageSeo>;
