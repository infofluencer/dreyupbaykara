"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { TreatmentShort } from "@/data/treatments";

export function TreatmentShorts({ shorts }: { shorts: TreatmentShort[] }) {
  const [active, setActive] = useState<TreatmentShort | null>(null);

  if (!shorts.length) return null;

  return (
    <>
      <div className="mt-12">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6b45]/70">
          Hasta videoları
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {shorts.map((short) => (
            <button
              key={short.id}
              type="button"
              onClick={() => setActive(short)}
              className="group relative aspect-[9/16] overflow-hidden rounded-[1.25rem] border border-[#0b6b45]/12 bg-[#123524] text-left shadow-[0_12px_36px_rgba(18,53,36,0.08)]"
              aria-label={`${short.title} videosunu izle`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${short.id}/hqdefault.jpg`}
                alt=""
                width={720}
                height={1280}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg transition group-hover:scale-105">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M8 5.5v13l11-6.5L8 5.5z" fill="#0b6b45" />
                  </svg>
                </span>
              </div>
              <p className="absolute inset-x-3 bottom-3 line-clamp-2 text-xs font-medium leading-snug text-white/95 sm:text-sm">
                {short.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {active ? (
          <ShortLightbox short={active} onClose={() => setActive(null)} />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ShortLightbox({
  short,
  onClose,
}: {
  short: TreatmentShort;
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
      aria-label={short.title}
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
        className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <p className="truncate text-sm font-medium text-white/90">{short.title}</p>
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
        <div className="relative aspect-[9/16] w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${short.id}?autoplay=1&rel=0`}
            title={short.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
