import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Check,
  Clock,
  Footprints,
  Hand,
  HeartPulse,
  Move,
  Scissors,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

export type TreatmentShort = {
  id: string;
  title: string;
};

export type TreatmentAdvantage = {
  icon: TreatmentIconName;
  title: string;
  desc?: string;
};

export type TreatmentSymptom = {
  icon: TreatmentIconName;
  text: string;
};

export type TreatmentProcessStep = {
  title: string;
  desc: string;
};

export type TreatmentComparison = {
  open: string[];
  endoscopic: string[];
};

export type TreatmentStat = {
  value: string;
  label: string;
};

export type TreatmentIconName =
  | "Scissors"
  | "HeartPulse"
  | "Zap"
  | "Sparkles"
  | "TrendingUp"
  | "TrendingDown"
  | "Activity"
  | "Clock"
  | "Hand"
  | "Move"
  | "Footprints"
  | "Check";

export const TREATMENT_ICONS: Record<TreatmentIconName, LucideIcon> = {
  Scissors,
  HeartPulse,
  Zap,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Hand,
  Move,
  Footprints,
  Check,
};

export type Treatment = {
  slug: string;
  navTitle: string;
  h1: string;
  heroSubtitle: string;
  image: string;
  youtubeId: string;
  shorts: TreatmentShort[];
  intro: string[];
  whatIsIt: { title: string; body: string[] };
  symptoms: { title: string; items: TreatmentSymptom[] };
  method: { title: string; body: string[] };
  advantages: TreatmentAdvantage[];
  comparison?: TreatmentComparison;
  processSteps?: TreatmentProcessStep[];
  stats?: TreatmentStat[];
  faq?: { q: string; a: string }[];
  metaTitle: string;
  metaDescription: string;
  bodyLocation: string;
};

const SHARED_ADVANTAGES: TreatmentAdvantage[] = [
  { icon: "Scissors", title: "Minimal İnvaziv" },
  { icon: "HeartPulse", title: "Az Ağrı" },
  {
    icon: "Zap",
    title: "4–6 Saat Taburcu",
    desc: "Çoğu hasta işlemden 4–6 saat sonra taburcu olur.",
  },
  { icon: "Sparkles", title: "Kozmetik Görünüm" },
  { icon: "TrendingUp", title: "Yüksek Başarı" },
];

const SHARED_COMPARISON: TreatmentComparison = {
  open: [
    "Büyük kesi",
    "Kasların kesilmesi",
    "Uzun hastane yatışı",
    "Dikiş ve iz",
    "Uzun iyileşme",
  ],
  endoscopic: [
    "Birkaç mm tek delik",
    "Kaslar korunur",
    "Çoğu hasta aynı gün taburcu",
    "Dikişsiz, minimal iz",
    "Hızlı iyileşme",
  ],
};

const SHARED_PROCESS: TreatmentProcessStep[] = [
  {
    title: "Muayene",
    desc: "Detaylı fiziksel muayene ve öykü değerlendirmesi",
  },
  {
    title: "Görüntüleme",
    desc: "MR ve gerekli tetkiklerle sorunun tespiti",
  },
  {
    title: "Endoskopik İşlem",
    desc: "Birkaç mm’lik tek delikten minimal invaziv müdahale",
  },
  {
    title: "Ayağa Kalkma",
    desc: "Çoğu hasta işlemin ardından aynı gün ayağa kalkar",
  },
  {
    title: "Taburcu",
    desc: "Kısa gözlem sonrası günlük yaşama hızlı dönüş",
  },
];

const SHARED_STATS: TreatmentStat[] = [
  { value: "4.9", label: "Google Puanı" },
  { value: "276+", label: "Hasta Yorumu" },
  { value: "Aynı Gün", label: "Taburcu" },
  { value: "Silivri", label: "Anadolu Hastanesi" },
];

export const treatments: Treatment[] = [
  {
    slug: "bel-fitigi-ameliyati",
    navTitle: "Full Endoskopik Tam Kapalı Bel Fıtığı Ameliyatı",
    h1: "Full Endoskopik Tam Kapalı Bel Fıtığı Ameliyatı",
    heroSubtitle:
      "Disk kaymasıyla oluşan bel fıtığında küçük kesi, az doku hasarı ve hızlı iyileşme.",
    image: "/hero/belfitigi.webp",
    youtubeId: "VQBLCfwLiLo",
    shorts: [
      {
        id: "sYwKXfSzjjE",
        title: "Full endoskopik bel fıtığı ameliyatında başarı",
      },
      {
        id: "pT5iM-Fw6t8",
        title: "Hasta hikâyesi — bel fıtığı",
      },
      {
        id: "OqcRVWgonHM",
        title: "Full endoskopik tam kapalı bel fıtığı ameliyatı",
      },
    ],
    intro: [
      "Bel fıtığı, günümüzde sıklıkla karşılaşılan, ancak doğru tedavi yöntemleri ile etkin bir şekilde çözülebilen bir sağlık sorunudur. Omurgadaki disklerin dış kısmının zayıflayarak iç kısmının dışarı doğru kayması sonucu oluşan bu rahatsızlık, genellikle sırt ağrısı, bacaklarda uyuşma ve güç kaybı gibi belirtilere yol açar. Hareket kısıtlılığına ve günlük yaşam aktivitelerinde zorlanmalara neden olan bel fıtığı, tedavi edilmediği takdirde daha ciddi sorunlara yol açabilir.",
    ],
    whatIsIt: {
      title: "Bel Fıtığı Tedavisi",
      body: [
        "Geleneksel bel fıtığı ameliyatları genellikle büyük kesiler ve daha uzun iyileşme süreçleri gerektirirken, Full Endoskopik Kapalı Bel Fıtığı Ameliyatı, bu süreci önemli ölçüde kısaltır. Modern tıbbi teknolojilerle yapılan bu minimal invaziv (az müdahaleli) işlem, hastaların daha kısa süre içinde iyileşmelerine ve normal yaşamlarına dönmelerine olanak tanır. Bu yöntemde, bel fıtığı bölgesine küçük bir kesi ile girilir ve endoskopik cihazlar kullanılarak fıtıklı bölgeye müdahale edilir. Bu sayede hem vücutta daha az doku hasarı oluşur hem de iyileşme süreci hızlanır.",
        "Full Endoskopik Kapalı Bel Fıtığı Ameliyatı, bel fıtığı tedavisinde kullanılan minimal invaziv (az invazyonlu) bir cerrahi tekniktir. Bu yöntemde, geleneksel açık ameliyatlardan farklı olarak, büyük kesiler yapılmaz. Bunun yerine, özel endoskopik cihazlar kullanılarak bel bölgesine çok küçük bir delikten girilir. Endoskopik sistem, fıtığın bulunduğu bölgeyi yüksek çözünürlükle görüntülemeyi sağlar ve cerrah, bu görüntüler eşliğinde sorunu çözmek için müdahale eder.",
      ],
    },
    symptoms: {
      title: "Belirtileri",
      items: [
        { icon: "Activity", text: "Bele ve kalçadan bacağa yayılan ağrı" },
        { icon: "Zap", text: "Bacaklarda uyuşma ve karıncalanma" },
        { icon: "TrendingDown", text: "Güç kaybı ve hareket kısıtlılığı" },
        {
          icon: "Clock",
          text: "Uzun süre oturunca veya ayakta kalınca artan ağrı",
        },
      ],
    },
    method: {
      title: "Full Endoskopik Tam Kapalı Yöntem",
      body: [
        "Geleneksel açık ameliyatların aksine büyük kesi yapılmaz. Bel bölgesine birkaç milimetrelik tek bir delikten girilir; endoskopik sistem fıtıklı bölgeyi yüksek çözünürlükle görüntüler ve cerrah bu görüntü eşliğinde müdahale eder.",
        "Bu sayede kaslar kesilmez, doku hasarı en aza iner ve hastaların çoğu aynı gün ayağa kalkar. İşlem süresi genellikle kısa tutulur; çoğu hasta birkaç saat içinde yürüyebilir.",
      ],
    },
    advantages: SHARED_ADVANTAGES,
    comparison: SHARED_COMPARISON,
    processSteps: SHARED_PROCESS,
    stats: SHARED_STATS,
    faq: [
      {
        q: "Aynı gün taburcu olabilir miyim?",
        a: "Çoğu hastada aynı gün ayağa kalkma ve taburcu mümkün olur. Kesin zamanlama, genel sağlık durumunuz ve ameliyat bulgularına göre belirlenir.",
      },
      {
        q: "Ne zaman taburcu olurum?",
        a: "Çoğu hasta işlemden sonra 4–6 saat içinde taburcu edilir. Genel sağlık durumunuz ve ameliyat bulgularına göre bu süre kişiselleştirilir.",
      },
      {
        q: "Açık ameliyattan farkı nedir?",
        a: "Büyük kesi ve kas kesisi yerine milimetrik bir giriş kullanılır. Bu da daha az ağrı, daha kısa iyileşme ve daha az iz demektir.",
      },
      {
        q: "Nükleoplastiden farkı nedir?",
        a: "Nükleoplasti, erken evre fıtıklarda diskin hacmini ısı enerjisiyle azaltmayı hedefler. Full endoskopik ameliyatta ise sinire baskı yapan fıtıklaşmış doku kamera rehberliğinde doğrudan çıkarılır; ameliyat düzeyindeki hastalarda kalıcı çözüm için tercih edilir.",
      },
    ],
    metaTitle:
      "Full Endoskopik Bel Fıtığı Ameliyatı | Op. Dr. Eyüp Baykara",
    metaDescription:
      "Bel fıtığında full endoskopik kapalı ameliyat: küçük kesi, az doku hasarı ve hızlı iyileşme. Sırt ağrısı, bacak uyuşması ve güç kaybına minimal invaziv çözüm.",
    bodyLocation: "Bel omurgası",
  },
  {
    slug: "boyun-fitigi-ameliyati",
    navTitle: "Full Endoskopik Tam Kapalı Boyun Fıtığı Ameliyatı",
    h1: "Full Endoskopik Tam Kapalı Boyun Fıtığı Ameliyatı",
    heroSubtitle:
      "Boyun ağrısı, kol uyuşması ve baş dönmesinde full endoskopik kapalı tedavi.",
    image: "/hero/boyunfitigi.webp",
    youtubeId: "X1CmSDhe03g",
    shorts: [
      {
        id: "HxKt2qsFuPY",
        title: "Full endoskopik boyun fıtığı — hasta hikâyesi",
      },
      {
        id: "dVDN0YPvcp4",
        title: "Full endoskopik tam kapalı boyun fıtığı ameliyatı",
      },
      {
        id: "XHOmBV4js_E",
        title: "Full endoskopik bel fıtığı ameliyatı ne kadar sürüyor?",
      },
    ],
    intro: [
      "Boyun fıtığı, modern yaşamın getirdiği hareketsiz yaşam tarzı ve yanlış duruş alışkanlıkları nedeniyle sıklıkla karşılaşılan bir sağlık sorunudur. Boyun ağrısı, kol uyuşması, baş dönmesi gibi şikayetlere neden olan boyun fıtığı, günümüzde farklı tedavi yöntemleriyle tedavi edilebilmektedir. Bu yöntemlerden biri de full endoskopik kapalı boyun fıtığı ameliyatıdır.",
    ],
    whatIsIt: {
      title: "Boyun Fıtığı Nedir?",
      body: [
        "Boyun omurları arasındaki diskler zamanla veya ani yüklenme ile yırtılabilir. Taşan disk materyali sinire baskı yapınca boyundan omuza ve kola yayılan ağrı, uyuşma veya güç kaybı oluşur.",
        "Konservatif tedaviler yeterli olmadığında veya nörolojik kayıp varsa cerrahi planlanır. Full endoskopik kapalı boyun fıtığı ameliyatında sinire baskı yapan parça kamera rehberliğinde hedeflenir; boyun hareketleri mümkün olduğunca korunur.",
      ],
    },
    symptoms: {
      title: "Belirtileri",
      items: [
        { icon: "Activity", text: "Boyun ağrısı ve omuza/kola yayılan ağrı" },
        { icon: "Zap", text: "Kolda veya elde uyuşma / karıncalanma" },
        { icon: "Hand", text: "El becerisinde azalma veya güçsüzlük" },
        { icon: "Move", text: "Baş dönmesi ve boyun tutulması" },
      ],
    },
    method: {
      title: "Full Endoskopik Tam Kapalı Yöntem",
      body: [
        "Boyun bölgesine milimetrik bir girişten endoskop ve mikro aletlerle ulaşılır. Sinire baskı yapan disk parçası yüksek çözünürlüklü görüntü altında temizlenir.",
        "İşlem genellikle 30–45 dakika sürer; lokal veya genel anestezi tercih edilebilir. Estetik iz minimaldir ve birçok hasta günler içinde günlük temposuna döner.",
      ],
    },
    advantages: SHARED_ADVANTAGES,
    comparison: SHARED_COMPARISON,
    processSteps: [
      ...SHARED_PROCESS.slice(0, 2),
      {
        title: "Endoskopik İşlem",
        desc: "Boyunda milimetrik girişle sinire baskı yapan parçanın temizlenmesi",
      },
      ...SHARED_PROCESS.slice(3),
    ],
    stats: SHARED_STATS,
    faq: [
      {
        q: "Boyun hareketlerim kısıtlanır mı?",
        a: "Endoskopik teknikte amaç hareketi korumaktır. Çoğu hastada boyun hareket açıklığı korunur; kişisel durumunuza göre rehabilitasyon planlanır.",
      },
      {
        q: "Ne kadar sürede iyileşirim?",
        a: "Birçok hasta 2–7 gün içinde günlük faaliyetlere döner. Ağır efor ve spor için hekiminizin verdiği takvime uyulması önemlidir.",
      },
      {
        q: "Ne zaman taburcu olurum?",
        a: "Çoğu hasta işlemden sonra 4–6 saat içinde taburcu edilir. Kesin süre, genel sağlık durumunuz ve ameliyat bulgularına göre belirlenir.",
      },
    ],
    metaTitle:
      "Full Endoskopik Boyun Fıtığı Ameliyatı | Op. Dr. Eyüp Baykara",
    metaDescription:
      "Boyun fıtığında full endoskopik kapalı ameliyat. Boyun ağrısı, kol uyuşması ve baş dönmesine minimal invaziv tedavi; hızlı iyileşme, küçük kesi.",
    bodyLocation: "Boyun omurgası",
  },
  {
    slug: "kanal-darligi-ameliyati",
    navTitle: "Full Endoskopik Tam Kapalı Kanal Darlığı Ameliyatı",
    h1: "Full Endoskopik Tam Kapalı Kanal Darlığı Ameliyatı",
    heroSubtitle:
      "Kanal darlığında ağrı, uyuşma ve güç kaybına minimal invaziv çözüm.",
    image: "/hero/kanaldarligi.webp",
    youtubeId: "5lDawOOxgeM",
    shorts: [
      {
        id: "q_MR5sTagJA",
        title: "Platinsiz kanal darlığı ameliyatında başarı",
      },
      {
        id: "vYCmcDkZOF4",
        title: "Kanal darlığı — hasta videosu",
      },
      {
        id: "idP4N3GZ-6I",
        title: "Full endoskopik kanal darlığı",
      },
    ],
    intro: [
      "Full endoskopik tam kapalı kanal darlığı ameliyatı, omurga kanalının daralması nedeniyle yaşanan ağrı, uyuşma ve güç kaybı gibi şikayetlerin giderilmesi için kullanılan, minimal invaziv bir cerrahi yöntemdir. Bu yöntem, geleneksel açık cerrahiye göre daha az invaziv olması, daha hızlı iyileşme süreci ve daha az komplikasyon riski taşıması gibi avantajlar sunar.",
    ],
    whatIsIt: {
      title: "Omurilik Kanal Darlığı Nedir?",
      body: [
        "Omurga kanalı, omurilik ve sinir köklerinin geçtiği koridordur. Kireçlenme, bağ hipertrofisi veya disk değişiklikleri bu koridoru daraltınca sinirler sıkışır; ağrı, uyuşma ve güç kaybı oluşabilir.",
        "İleri yaşta daha sık görülür. Full endoskopik tam kapalı yöntem, açık cerrahiye göre daha az invazivdir; daraltan dokular mikro aletlerle temizlenir, iyileşme hızlanır ve komplikasyon riski azalır.",
      ],
    },
    symptoms: {
      title: "Belirtileri",
      items: [
        { icon: "Activity", text: "Yürürken artan bel ve bacak ağrısı" },
        { icon: "Footprints", text: "Kısa mesafede dinlenme ihtiyacı" },
        { icon: "Zap", text: "Bacaklarda uyuşma veya güç kaybı" },
        { icon: "Move", text: "Öne eğilince geçici rahatlama" },
      ],
    },
    method: {
      title: "Full Endoskopik Tam Kapalı Yöntem",
      body: [
        "Milimetrik bir girişten endoskop ile daralmış bölge görüntülenir. Sinir sıkışmasına yol açan kemik ve bağ yapıları kontrollü biçimde temizlenerek kanal genişletilir.",
        "Klasik açık cerrahiye kıyasla travma daha azdır; birçok hastada yürüme mesafesi ve günlük konfor belirgin şekilde artar. Daha hızlı iyileşme ve daha düşük komplikasyon riski hedeflenir.",
      ],
    },
    advantages: [
      { icon: "Scissors", title: "Minimal İnvaziv" },
      { icon: "HeartPulse", title: "Az Ağrı" },
      {
        icon: "Zap",
        title: "4–6 Saat Taburcu",
        desc: "Çoğu hasta işlemden 4–6 saat sonra taburcu olur.",
      },
      { icon: "TrendingUp", title: "Yürüme mesafesinde artış" },
    ],
    comparison: {
      open: [
        "Geniş kesi ve daha fazla doku travması",
        "Daha uzun hastane yatışı",
        "Bazen platin / sabitleme ihtiyacı",
        "Daha belirgin iz",
        "Daha uzun iyileşme",
      ],
      endoscopic: [
        "Milimetrik tek giriş",
        "Seçilmiş hastalarda platin olmadan",
        "Çoğu hasta aynı gün / kısa sürede ayağa kalkar",
        "Minimal iz",
        "Hızlı iyileşme hedefi",
      ],
    },
    processSteps: [
      ...SHARED_PROCESS.slice(0, 2),
      {
        title: "Endoskopik Dekompresyon",
        desc: "Daraltan dokuların kamera altında kontrollü temizlenmesi",
      },
      ...SHARED_PROCESS.slice(3),
    ],
    stats: SHARED_STATS,
    faq: [
      {
        q: "Ne zaman taburcu olurum?",
        a: "Çoğu hasta işlemden sonra 4–6 saat içinde taburcu edilir. Kesin süre, genel sağlık durumunuz ve ameliyat bulgularına göre belirlenir.",
      },
      {
        q: "Platin gerekir mi?",
        a: "Seçilmiş hastalarda endoskopik dekompresyon platin olmadan uygulanabilir. Sabitleme ihtiyacı olup olmadığı muayene ve görüntülemeyle belirlenir.",
      },
      {
        q: "Yürüme mesafem artar mı?",
        a: "Sinir baskısı azaldığında birçok hastada yürüme mesafesi ve günlük aktivite kapasitesi belirgin şekilde iyileşir. Sonuçlar kişiye göre değişir.",
      },
    ],
    metaTitle:
      "Full Endoskopik Kanal Darlığı Ameliyatı | Op. Dr. Eyüp Baykara",
    metaDescription:
      "Full endoskopik tam kapalı kanal darlığı ameliyatı: ağrı, uyuşma ve güç kaybına minimal invaziv çözüm. Hızlı iyileşme, daha az komplikasyon riski.",
    bodyLocation: "Omurga kanalı",
  },
];

export function getTreatment(slug: string) {
  return treatments.find((t) => t.slug === slug);
}

export function getRelatedTreatments(slug: string) {
  return treatments.filter((t) => t.slug !== slug);
}
