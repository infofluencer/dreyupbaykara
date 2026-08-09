"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VectorPattern } from "@/components/VectorPattern";
import { HOME_FALLBACK, type HomeCopyBlock } from "@/lib/cms/home";

const VIDEOS = [
  {
    id: "q_MR5sTagJA",
    title: "Platinsiz kanal darlığı ameliyatında başarı",
  },
  {
    id: "5lDawOOxgeM",
    title: "Tam kapalı kanal darlığı ameliyatında başarı",
  },
  {
    id: "PhAdUS6L-0g",
    title: "Platinsiz kanal darlığı ameliyatı",
  },
  {
    id: "2Q2hgmrgFhE",
    title: "Bel fıtığı ameliyatında başarı",
  },
  {
    id: "nQ4D3KEtcb8",
    title: "Tam kapalı bel fıtığı ameliyatı",
  },
  {
    id: "y_f0oylW9wo",
    title: "Full endoskopik bel fıtığı ameliyatı",
  },
  {
    id: "Lvkb4pnC_lo",
    title: "Bel fıtığı ameliyatı — başarı hikâyesi",
  },
  {
    id: "VQBLCfwLiLo",
    title: "Tam kapalı bel fıtığı cerrahisi",
  },
  {
    id: "X1CmSDhe03g",
    title: "Boyun fıtığı ameliyatında başarı",
  },
  {
    id: "V5XXy8cLqAo",
    title: "Platinsiz kanal darlığı — tam kapalı",
  },
  {
    id: "fGlQG0JpaIg",
    title: "Bel fıtığında full endoskopik yaklaşım",
  },
  {
    id: "eE7T_oT8l44",
    title: "Bel fıtığı ameliyatı süreci",
  },
] as const;

type Video = (typeof VIDEOS)[number];

function PlayIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="white" fillOpacity="0.94" />
      <path d="M19 15.5l16 8.5-16 8.5V15.5z" fill="#0b6b45" />
    </svg>
  );
}

function VideoLightbox({
  video,
  onClose,
}: {
  video: Video;
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
        className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
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

        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function YouTubeGallery({
  showHeader = true,
  copy = HOME_FALLBACK.youtube,
}: {
  showHeader?: boolean;
  copy?: HomeCopyBlock;
}) {
  const [active, setActive] = useState<Video | null>(null);

  return (
    <section
      id="video-galeri"
      className={`relative overflow-hidden bg-[#fdfaf5] px-6 pb-24 md:px-10 lg:px-16 ${
        showHeader
          ? "rounded-t-[2rem] pt-14 md:rounded-t-[2.5rem] md:pt-16"
          : "pt-10 md:pt-12"
      }`}
    >
      <VectorPattern tone="light" opacity={0.04} size={400} />
      <div className="relative mx-auto max-w-7xl">
        {showHeader ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0b6b45]/70">
                {copy.kicker}
              </p>
              <h2 className="font-[family-name:var(--font-instrument-sans)] text-3xl font-semibold tracking-tight text-[#123524] sm:text-4xl">
                {copy.title}
              </h2>
            </div>
            <a
              href="https://www.youtube.com/@op.dr.eyupbaykara465"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[#0b6b45] transition hover:text-[#085436] sm:self-auto"
            >
              YouTube’da izle
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M7 17L17 7M17 7H8M17 7v9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </motion.div>
        ) : (
          <div className="mb-8 flex justify-end">
            <a
              href="https://www.youtube.com/@op.dr.eyupbaykara465"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b6b45] transition hover:text-[#085436]"
            >
              YouTube’da izle
              <span aria-hidden>→</span>
            </a>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEOS.map((video, i) => (
            <motion.button
              key={video.id}
              type="button"
              onClick={() => setActive(video)}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.55,
                delay: Math.min(i, 8) * 0.04,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group overflow-hidden rounded-[1.35rem] border border-[#0b6b45]/12 bg-white text-left shadow-sm transition duration-300 hover:border-[#0b6b45]/35 hover:shadow-[0_12px_36px_rgba(11,107,69,0.1)]"
              aria-label={`${video.title} — izle`}
            >
              <div className="relative aspect-video overflow-hidden bg-[#123524]/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                  alt={video.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-80 transition duration-300 group-hover:opacity-100">
                  <div className="transition duration-300 group-hover:scale-110">
                    <PlayIcon />
                  </div>
                </div>
              </div>
              <div className="px-4 py-4">
                <p className="text-[14px] font-semibold leading-snug text-[#123524] transition group-hover:text-[#0b6b45]">
                  {video.title}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {active ? (
          <VideoLightbox video={active} onClose={() => setActive(null)} />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
