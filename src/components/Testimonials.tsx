"use client";

import { motion } from "framer-motion";
import { HOME_FALLBACK, type HomeCopyBlock } from "@/lib/cms/home";

const RATING_BADGES = [
  {
    id: "google",
    name: "Google",
    rating: "4,9/5",
    count: "276 yorum",
    href: "https://www.google.com/maps/search/?api=1&query=Op.+Dr.+Ey%C3%BCp+Baykara",
  },
  {
    id: "doktortakvimi",
    name: "DoktorTakvimi",
    rating: "5/5",
    count: "23 yorum",
    href: "https://www.doktortakvimi.com/eyup-baykara/beyin-ve-sinir-cerrahisi/istanbul#opinions",
  },
] as const;

/** Kaynak: kullanıcının paylaştığı Google / DoktorTakvimi yorumları (yalnızca verilen metin). */
const TESTIMONIALS = [
  {
    name: "Deniz Öğüt",
    source: "Google",
    stars: 5,
    quote:
      "Yaklaşık üç yıldır muzdarip olduğum bel fıtığı ve kanal daralması rahatsızlığımdan Eyüp Hocam sayesinde kurtuldum.",
  },
  {
    name: "Leyla Tamdogan",
    source: "Google",
    stars: 5,
    quote:
      "72 yaşındaki annem Op. Dr. Eyüp Baykara tarafından gerçekleştirilen full kapalı endoskopik ameliyatını başarıyla geçirdi. Allah bin kere razı olsun.",
  },
  {
    name: "Hüsnü Aksoy",
    source: "Google",
    stars: 5,
    quote:
      "Geçirdiğim bel fıtığı ameliyatını son derece kolay ve konforlu bir sürece dönüştüren Sevgili Eyüp Hocam’a sonsuz teşekkürlerimi sunarım.",
  },
  {
    name: "Hatice Fındık",
    source: "Google",
    stars: 5,
    quote:
      "1 haftadır geçmeyen bacak ağrısı, yürüyememe, uyuyamama şikayeti üzerine giden kuzenim kısa süren bir operasyonla eski sağlığına kavuştu.",
  },
  {
    name: "Gözde Memiş Demirkaya",
    source: "Google",
    stars: 5,
    quote:
      "16.05.2026 tarihinde Eyüp Baykara’nın eşliğinde bel kanal daralması ameliyatı gerçekleştirdik. Tedavi öncesinde bel ve bacak ağrısı vardı.",
  },
  {
    name: "Cengiz Yavaş",
    source: "Google",
    stars: 5,
    quote:
      "Değerli doktorumuzun ilgisi, bilgisi ve güven veren yaklaşımı sayesinde ameliyat sürecini çok rahat geçirdik. Şimdi annem çok daha iyi hissediyor.",
  },
  {
    name: "Gonca Demiröz",
    source: "Google",
    stars: 5,
    quote:
      "15 aydır devam eden, sağ kalçamdan komple bacağıma vuran, yürütmeyen, oturmaya izin vermeyen, geceleri sızıdan uyutmayan ağrılarım vardı.",
  },
  {
    name: "Gül Dursun",
    source: "Google",
    stars: 5,
    quote:
      "Bel fıtığı nedeniyle şiddetli bacak ağrısı yaşayan eşim, Dr. Eyüp Baykara tarafından ameliyat edildi. Açıkçası ameliyat konusunda çok endişeliydik.",
  },
  {
    name: "Belgin Çilingir",
    source: "Google",
    stars: 5,
    quote:
      "1 yıldır devam eden ama son 5 ayda daha fazla artan, belimden ayağıma doğru vuran, geceleri uyutmayan, yürümekte fazlasıyla zorlandıran ağrılarım vardı.",
  },
] as const;

export function Testimonials({
  showHeader = true,
  copy = HOME_FALLBACK.testimonials,
}: {
  showHeader?: boolean;
  copy?: HomeCopyBlock;
}) {
  return (
    <section
      id="yorumlar"
      className={`relative px-6 pb-16 md:px-10 md:pb-20 lg:px-16 ${
        showHeader ? "pt-4 md:pt-6" : "pt-10 md:pt-12"
      }`}
    >
      <div className="relative mx-auto max-w-7xl">
        {showHeader ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10 text-center md:mb-12"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0b6b45]/70">
              {copy.kicker}
            </p>
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-3xl font-semibold tracking-tight text-[#123524] sm:text-4xl">
              {copy.title}
            </h2>
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 grid grid-cols-1 gap-3 sm:mb-10 sm:grid-cols-2 sm:gap-4"
        >
          {RATING_BADGES.map((badge) => (
            <a
              key={badge.id}
              href={badge.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-2xl border border-[#123524]/10 bg-[#123524] px-4 py-3.5 transition hover:border-[#0b6b45]/40 hover:bg-[#0f2e20] sm:px-5 sm:py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {badge.id === "google" ? <GoogleMark /> : <DoktorTakvimiMark />}
                  <span className="text-sm font-medium text-white/90">{badge.name}</span>
                </div>
                <ExternalLinkIcon />
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                <span className="font-[family-name:var(--font-instrument-sans)] text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
                  {badge.rating}
                </span>
                <span className="pb-1 text-sm text-white/45">{badge.count}</span>
              </div>
            </a>
          ))}
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((item, i) => (
            <motion.blockquote
              key={item.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.55,
                delay: Math.min(i, 8) * 0.04,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative flex flex-col rounded-[1.5rem] border border-[#0b6b45]/12 bg-white px-5 py-6 shadow-[0_12px_36px_rgba(18,53,36,0.06)] sm:px-6 sm:py-7"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <StarRating value={item.stars} />
                <span className="text-xs font-medium tracking-wide text-[#0b6b45]/70">
                  {item.source}
                </span>
              </div>
              <p className="flex-1 text-sm leading-7 text-[#466254] sm:text-[15px]">
                “{item.quote}”
              </p>
              <footer className="mt-6 border-t border-[#0b6b45]/10 pt-4">
                <cite className="font-[family-name:var(--font-instrument-sans)] text-sm font-semibold not-italic text-[#123524]">
                  {item.name}
                </cite>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${value} üzerinden 5 yıldız`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={i < value ? "text-[#0b6b45]" : "text-[#0b6b45]/20"}
        >
          <path
            fill="currentColor"
            d="M12 2.5l2.85 5.78 6.38.93-4.62 4.5 1.09 6.36L12 16.98l-5.7 3.09 1.09-6.36-4.62-4.5 6.38-.93L12 2.5z"
          />
        </svg>
      ))}
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="text-white/35 transition group-hover:text-white/60"
    >
      <path
        d="M14 5h5v5M19 5l-9 9M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function DoktorTakvimiMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#5B6CFF" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#9EB0FF" strokeWidth="1.4" />
      <path
        d="M8 12.5c1.2 1.8 2.4 2.8 4 2.8s2.8-1 4-2.8"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9.2" cy="10.2" r="1" fill="#fff" />
      <circle cx="14.8" cy="10.2" r="1" fill="#fff" />
    </svg>
  );
}
