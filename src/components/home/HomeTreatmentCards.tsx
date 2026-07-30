"use client";

import { motion, type MotionValue } from "framer-motion";

interface HomeTreatmentCardsProps {
  pointerEvents?: MotionValue<"auto" | "none">;
}

export function HomeTreatmentCards({ pointerEvents }: HomeTreatmentCardsProps) {
  return (
    <motion.div
      className="w-full max-w-[36rem] sm:max-w-[40rem] lg:max-w-[44rem]"
      style={pointerEvents ? { pointerEvents } : undefined}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-5 flex items-center gap-3 sm:gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/kaduseus-green.png"
          alt=""
          aria-hidden="true"
          className="h-10 w-10 shrink-0 object-contain drop-shadow-sm sm:h-12 sm:w-12"
          decoding="async"
        />
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent sm:text-xs">
          Full Endoskopik Cerrahi
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/kaduseus-green.png"
          alt=""
          aria-hidden="true"
          className="h-10 w-10 shrink-0 object-contain drop-shadow-sm sm:h-12 sm:w-12"
          decoding="async"
        />
      </div>

      <h1 className="font-[family-name:var(--font-instrument-sans)] text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] text-text sm:text-[2.65rem] lg:text-[3.15rem]">
        Bitmek bilmeyen
        <br />
        <span className="text-accent">fıtık ağrılarınız</span>
        <br />
        mı var?
      </h1>

      <div className="mt-5 max-w-lg border-l-2 border-accent/40 pl-4 sm:mt-6 sm:pl-5">
        <p className="font-[family-name:var(--font-instrument-sans)] text-base font-medium leading-snug text-text sm:text-lg">
          Son çare değil — <span className="text-accent">tek çare</span>
        </p>
        <p className="mt-1 font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-tight text-text sm:text-2xl">
          Full Endoskopik Tedavi
        </p>
        <p className="mt-2.5 text-sm leading-relaxed text-text-muted sm:text-[15px]">
          Birkaç milimetrelik tek girişten, kas kesmeden, dikişsiz.
        </p>
      </div>

      <div className="mt-7 flex max-w-[22rem] justify-center sm:mt-8 sm:max-w-[24rem]">
        <a
          href="/iletisim"
          className="pointer-events-auto inline-flex min-w-[15rem] items-center justify-center rounded-lg bg-accent px-10 py-3.5 text-base font-semibold text-white shadow-[0_0_24px_rgba(11,107,69,0.35)] transition hover:bg-accent-glow"
        >
          Randevu Al
        </a>
      </div>
    </motion.div>
  );
}
