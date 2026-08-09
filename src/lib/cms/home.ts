export type HomeStat = {
  value: number;
  suffix: string;
  label: string;
  icon: string;
};

export type HomeHero = {
  kicker: string;
  titleBefore: string;
  titleHighlight: string;
  titleAfter: string;
  line1: string;
  line1Highlight: string;
  line2: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  doctorName1: string;
  doctorName2: string;
  doctorBio: string;
  rating: string;
  reviewCount: string;
  doctorImage: string;
  doctorYears: string;
  doctorPerk: string;
};

export type HomeWhyUs = {
  label: string;
  text: string;
  image: string;
  stats: HomeStat[];
};

export type HomeCopyBlock = {
  kicker: string;
  title: string;
  description?: string;
  ctaLabel?: string;
};

export type HomeBanner = {
  image: string;
  alt: string;
};

export type HomeSections = {
  hero: HomeHero;
  whyUs: HomeWhyUs;
  leadForm: HomeCopyBlock;
  instagram: HomeCopyBlock;
  testimonials: HomeCopyBlock;
  youtube: HomeCopyBlock;
  blog: HomeCopyBlock;
  banner: HomeBanner;
};

export const HOME_FALLBACK: HomeSections = {
  hero: {
    kicker: "Full Endoskopik Cerrahi",
    titleBefore: "Bitmek bilmeyen",
    titleHighlight: "fıtık ağrılarınız",
    titleAfter: "mı var?",
    line1: "Son çare değil —",
    line1Highlight: "tek çare",
    line2: "Full Endoskopik Tedavi",
    description:
      "4 milimetrelik bir delikten kamera ile girilip fıtıklaşan dokunun alınmasıdır.",
    ctaLabel: "Randevu Al",
    ctaHref: "/iletisim",
    doctorName1: "Op. Dr.",
    doctorName2: "Eyüp Baykara",
    doctorBio:
      "Beyin ve Sinir Cerrahisi Uzmanı. Full endoskopik tam kapalı yöntemle hızlı iyileşme.",
    rating: "4,9",
    reviewCount: "276 yorum",
    doctorImage: "/hero/hero_dr.webp",
    doctorYears: "15+",
    doctorPerk: "Aynı gün taburcu",
  },
  whyUs: {
    label: "Neden bizi seçmelisiniz?",
    text: "15 yılı aşkın deneyim, 1000+ memnun hasta. Minimal invaziv ve full endoskopik yaklaşımla aynı gün ayağa kalkma, hızlı iyileşme.",
    image: "/hero/hero_dr.webp",
    stats: [
      { icon: "heart", value: 15, suffix: "+", label: "Yıl deneyim" },
      { icon: "trophy", value: 1000, suffix: "+", label: "Memnun hasta" },
    ],
  },
  leadForm: {
    kicker: "Op. Dr. Eyüp Baykara",
    title: "Kalçadan Bacağa Vuran Ağrı",
    description:
      "Full Endoskopik Tam Kapalı Fıtık Ameliyatı ile aynı gün taburcu olun. Formu doldurun, sizi arayalım.",
  },
  instagram: {
    kicker: "Instagram",
    title: "@doktoreyupbaykara",
  },
  testimonials: {
    kicker: "Hasta hikâyeleri",
    title: "Hasta hikayeleri",
  },
  youtube: {
    kicker: "Video galeri",
    title: "Hasta videoları",
  },
  blog: {
    kicker: "Bilgi köşesi",
    title: "Blog",
    ctaLabel: "Tüm yazılar",
  },
  banner: {
    image: "/drtv.webp",
    alt: "Op. Dr. Eyüp Baykara — ameliyathane",
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mergeHero(raw: unknown): HomeHero {
  const r = asRecord(raw);
  const f = HOME_FALLBACK.hero;
  return {
    kicker: str(r.kicker, f.kicker),
    titleBefore: str(r.titleBefore, f.titleBefore),
    titleHighlight: str(r.titleHighlight, f.titleHighlight),
    titleAfter: str(r.titleAfter, f.titleAfter),
    line1: str(r.line1, f.line1),
    line1Highlight: str(r.line1Highlight, f.line1Highlight),
    line2: str(r.line2, f.line2),
    description: str(r.description, f.description),
    ctaLabel: str(r.ctaLabel, f.ctaLabel),
    ctaHref: str(r.ctaHref, f.ctaHref),
    doctorName1: str(r.doctorName1, f.doctorName1),
    doctorName2: str(r.doctorName2, f.doctorName2),
    doctorBio: str(r.doctorBio, f.doctorBio),
    rating: str(r.rating, f.rating),
    reviewCount: str(r.reviewCount, f.reviewCount),
    doctorImage: str(r.doctorImage, f.doctorImage),
    doctorYears: str(r.doctorYears, f.doctorYears),
    doctorPerk: str(r.doctorPerk, f.doctorPerk),
  };
}

function mergeWhyUs(raw: unknown): HomeWhyUs {
  const r = asRecord(raw);
  const f = HOME_FALLBACK.whyUs;
  const statsRaw = Array.isArray(r.stats) ? r.stats : f.stats;
  const stats = (statsRaw.length ? statsRaw : f.stats).slice(0, 4).map((item, i) => {
    const row = asRecord(item);
    const fb = f.stats[i] ?? f.stats[0];
    return {
      icon: str(row.icon, fb.icon),
      value: num(row.value, fb.value),
      suffix: str(row.suffix, fb.suffix),
      label: str(row.label, fb.label),
    };
  });
  return {
    label: str(r.label, f.label),
    text: str(r.text, f.text),
    image: str(r.image, f.image),
    stats,
  };
}

function mergeCopy(raw: unknown, fallback: HomeCopyBlock): HomeCopyBlock {
  const r = asRecord(raw);
  return {
    kicker: str(r.kicker, fallback.kicker),
    title: str(r.title, fallback.title),
    description: str(r.description, fallback.description ?? ""),
    ctaLabel: str(r.ctaLabel, fallback.ctaLabel ?? ""),
  };
}

export function mergeHomeSections(raw: unknown): HomeSections {
  const r = asRecord(raw);
  const banner = asRecord(r.banner);
  return {
    hero: mergeHero(r.hero),
    whyUs: mergeWhyUs(r.whyUs),
    leadForm: mergeCopy(r.leadForm, HOME_FALLBACK.leadForm),
    instagram: mergeCopy(r.instagram, HOME_FALLBACK.instagram),
    testimonials: mergeCopy(r.testimonials, HOME_FALLBACK.testimonials),
    youtube: mergeCopy(r.youtube, HOME_FALLBACK.youtube),
    blog: mergeCopy(r.blog, HOME_FALLBACK.blog),
    banner: {
      image: str(banner.image, HOME_FALLBACK.banner.image),
      alt: str(banner.alt, HOME_FALLBACK.banner.alt),
    },
  };
}

export async function getHomeSections(): Promise<HomeSections> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return mergeHomeSections(undefined);
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("setting_key", "home.sections")
    .eq("is_public", true)
    .maybeSingle();
  return mergeHomeSections(data?.value);
}

export function homeImageUrl(path: string): string {
  if (!path) return path;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("/")
  ) {
    return path;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url
    ? `${url}/storage/v1/object/public/site-media/${path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`
    : path;
}
