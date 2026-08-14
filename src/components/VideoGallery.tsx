"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HOME_FALLBACK, type HomeCopyBlock } from "@/lib/cms/home";

type GalleryVideo = {
  id: string;
  thumb: string;
  title: string;
  desc: string;
  url: string;
};

const VIDEOS: GalleryVideo[] = [
  {
    id: "reel-DYpmtdTBQrc",
    thumb: "/hero/instagram/reel-DYpmtdTBQrc.jpg",
    title: "Full Endoskopik Bel Fıtığı Ameliyatı",
    desc: "5 milimetrelik tek girişten, kas kesmeden, aynı gün taburcu.",
    url: "https://www.instagram.com/reel/DYpmtdTBQrc/",
  },
  {
    id: "post-DNGq36fuxkG",
    thumb: "/hero/instagram/post-DNGq36fuxkG.jpg",
    title: "Boyun Fıtığı — Endoskopik Yaklaşım",
    desc: "Kola vuran boyun ağrısında milimetrik girişle sinir baskısı gideriliyor.",
    url: "https://www.instagram.com/p/DNGq36fuxkG/",
  },
  {
    id: "post-DWo4I_ghjgO",
    thumb: "/hero/instagram/post-DWo4I_ghjgO.jpg",
    title: "Kanal Darlığı Ameliyatı Süreci",
    desc: "Platin olmadan dekompresyon ile yürüme mesafesinde belirgin artış.",
    url: "https://www.instagram.com/p/DWo4I_ghjgO/",
  },
  {
    id: "reel-DOgy7JVDAa6",
    thumb: "/hero/instagram/reel-DOgy7JVDAa6.jpg",
    title: "Nükleoplasti Sonrası Kalıcı Çözüm",
    desc: "Üç kez sonuç alınamayan tedavi sonrası full endoskopik ameliyatla dakikalar içinde rahatlama.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DOgy7JVDAa6/",
  },
  {
    id: "reel-DEIh4vpIMZp",
    thumb: "/hero/instagram/reel-DEIh4vpIMZp.jpg",
    title: "Bel Fıtığında Endoskopik Yaklaşım",
    desc: "Bel fıtığı tedavisinde minimal invaziv yaklaşımın hasta konforuna etkisini anlatan reel.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DEIh4vpIMZp/",
  },
  {
    id: "reel-DPWyN1yDJOi",
    thumb: "/hero/instagram/reel-DPWyN1yDJOi.jpg",
    title: "Bel, Boyun Fıtığı ve Kanal Darlığı",
    desc: "Ameliyat düzeyine gelmiş hastalarda full endoskopik yöntemle hızlı iyileşme ve erken taburculuk.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DPWyN1yDJOi/",
  },
  {
    id: "reel-Da0p51xg6Xg",
    thumb: "/hero/instagram/reel-Da0p51xg6Xg.jpg",
    title: "Yürümeyi Zorlaştıran Bel Fıtığı ve Kanal Darlığı",
    desc: "Bel fıtığı ve kanal darlığına bağlı yürüyememe şikayetinde minimal invaziv çözüm yaklaşımı.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/Da0p51xg6Xg/",
  },
  {
    id: "reel-DXzde1cszGk",
    thumb: "/hero/instagram/reel-DXzde1cszGk.jpg",
    title: "Bel Fıtıklarının Büyük Bölümünde Ameliyatsız Tedavi",
    desc: "Hangi hastalarda ameliyatsız yaklaşım yeterli olur, hangi noktada cerrahi gerekir sorusuna kısa açıklama.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DXzde1cszGk/",
  },
  {
    id: "reel-DXcW45PANjc",
    thumb: "/hero/instagram/reel-DXcW45PANjc.jpg",
    title: "İleri Düzey Kanal Darlığında Platinsiz Yaklaşım",
    desc: "İki seviyeli kanal darlığında platin önermeden yapılan full endoskopik tedavi örneği.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DXcW45PANjc/",
  },
  {
    id: "reel-DUtSl19DJ2i",
    thumb: "/hero/instagram/reel-DUtSl19DJ2i.jpg",
    title: "Patlamış Bel Fıtığında Tam Kapalı Yöntem",
    desc: "Patlamış bel fıtığında 4-5 mm girişle uygulanan full endoskopik cerrahi ve hızlı iyileşme süreci.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DUtSl19DJ2i/",
  },
  {
    id: "reel-DTyETquDIMi",
    thumb: "/hero/instagram/reel-DTyETquDIMi.jpg",
    title: "Omurilik Kanal Darlığında Platinsiz Tedavi",
    desc: "Kanal darlığında tam kapalı, platinsiz yaklaşımın avantajlarını anlatan bilgilendirici reel.",
    url: "https://www.instagram.com/doktoreyupbaykara/reel/DTyETquDIMi/",
  },
];

function getInstagramEmbedSrc(url: string): string {
  const reel = url.match(/\/reel\/([A-Za-z0-9_-]+)/);
  if (reel) return `https://www.instagram.com/reel/${reel[1]}/embed`;
  const post = url.match(/\/p\/([A-Za-z0-9_-]+)/);
  if (post) return `https://www.instagram.com/p/${post[1]}/embed`;
  return url;
}

function PlayIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="22" fill="white" fillOpacity="0.92" />
      <path d="M18 14.5l14 7.5-14 7.5V14.5z" fill="#0b6b45" />
    </svg>
  );
}

function InstagramLightbox({
  video,
  onClose,
}: {
  video: GalleryVideo;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex max-h-[90vh] w-full max-w-[26rem] flex-col overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <p className="truncate text-sm font-medium text-white/90">{video.title}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Kapat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-black">
          <iframe
            src={getInstagramEmbedSrc(video.url)}
            title={video.title}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="h-[min(72vh,40rem)] w-full border-0"
          />
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-white/70 underline-offset-2 transition hover:text-white hover:underline"
          >
            Instagram’da aç
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

const LOOP_VIDEOS = [...VIDEOS, ...VIDEOS];

export function VideoGallery({
  copy = HOME_FALLBACK.instagram,
}: {
  copy?: HomeCopyBlock;
}) {
  const [active, setActive] = useState<GalleryVideo | null>(null);

  return (
    <section
      id="instagram"
      className="relative z-10 overflow-hidden pb-8 pt-16"
    >
      <div className="mx-auto mb-8 flex max-w-7xl items-end justify-between gap-4 px-6 md:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-2 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="text-accent-glow"
            >
              <rect
                x="2"
                y="2"
                width="20"
                height="20"
                rx="5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
            </svg>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-glow">
              {copy.kicker}
            </p>
          </div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {copy.title}
          </h2>
        </motion.div>

        <a
          href="https://www.instagram.com/doktoreyupbaykara/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#0b6b45]/20 px-4 py-2 text-sm font-medium text-[#0b6b45] transition hover:border-[#0b6b45] hover:bg-[#f4fbf7] sm:px-5 sm:py-2.5"
        >
          Takip Et
        </a>
      </div>

      {/* Tam genişlik yatay şerit */}
      <div className="relative w-full overflow-hidden">
        <motion.div
          className="flex w-max gap-4 pl-6 sm:gap-5 md:pl-10 lg:pl-16"
          animate={active ? undefined : { x: ["0%", "-50%"] }}
          transition={
            active
              ? undefined
              : {
                  duration: 48,
                  ease: "linear",
                  repeat: Number.POSITIVE_INFINITY,
                }
          }
        >
          {LOOP_VIDEOS.map((v, i) => (
            <motion.button
              key={`${v.id}-${i}`}
              type="button"
              onClick={() => setActive(v)}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.6,
                delay: Math.min(i, 7) * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group block w-[min(17.5rem,72vw)] shrink-0 overflow-hidden rounded-[1.4rem] border-2 border-[#0b6b45]/25 bg-white text-left shadow-sm transition duration-300 hover:border-[#0b6b45] hover:shadow-[0_8px_28px_rgba(11,107,69,0.12)] sm:w-[19rem] lg:w-[20.5rem]"
              aria-label={`${v.title} videosunu izle`}
            >
              <div className="relative overflow-hidden" style={{ aspectRatio: "9/13" }}>
                <Image
                  src={v.thumb}
                  alt={v.title}
                  fill
                  sizes="(min-width: 1024px) 328px, (min-width: 640px) 304px, 72vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-75 transition duration-300 group-hover:opacity-100">
                  <div className="transition duration-300 group-hover:scale-110">
                    <PlayIcon />
                  </div>
                </div>
              </div>

              <div className="p-4">
                <p className="text-[14px] font-semibold leading-snug text-[#123524] transition duration-200 group-hover:text-[#0b6b45]">
                  {v.title}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[#64748b]">
                  {v.desc}
                </p>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {active ? (
          <InstagramLightbox video={active} onClose={() => setActive(null)} />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
