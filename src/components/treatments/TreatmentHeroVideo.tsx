"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type TreatmentHeroVideoProps = {
  youtubeId: string;
  title: string;
  /** PageHero sağ paneli için kenardan kenara */
  fill?: boolean;
};

export function TreatmentHeroVideo({
  youtubeId,
  title,
  fill = false,
}: TreatmentHeroVideoProps) {
  const [open, setOpen] = useState(false);
  const thumb = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          fill
            ? "group relative h-full w-full overflow-hidden bg-[#123524] text-left"
            : "group relative aspect-video w-full overflow-hidden rounded-[1.75rem] border border-[#0b6b45]/10 bg-[#123524] text-left shadow-[0_24px_60px_rgba(18,53,36,0.08)]"
        }
        aria-label={`${title} videosunu izle`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt=""
          width={1280}
          height={720}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg transition group-hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5L8 5.5z" fill="#0b6b45" />
            </svg>
          </span>
        </div>
        <p className="absolute bottom-4 left-4 right-4 truncate text-sm font-medium text-white/95 sm:bottom-5 sm:left-5 sm:right-5 sm:text-base">
          {title}
        </p>
      </button>

      <AnimatePresence>
        {open ? (
          <VideoLightbox
            youtubeId={youtubeId}
            title={title}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function VideoLightbox({
  youtubeId,
  title,
  onClose,
}: {
  youtubeId: string;
  title: string;
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
      aria-label={title}
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
          <p className="truncate text-sm font-medium text-white/90">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
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
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
