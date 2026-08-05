"use client";

import { motion, type MotionValue } from "framer-motion";

interface HomeTreatmentCardsProps {
  pointerEvents?: MotionValue<"auto" | "none">;
  /** Compact typography/spacing for mobile hero only */
  compact?: boolean;
}

export function HomeTreatmentCards({
  pointerEvents,
  compact = false,
}: HomeTreatmentCardsProps) {
  if (compact) {
    return (
      <motion.div
        className="w-full"
        style={pointerEvents ? { pointerEvents } : undefined}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-3 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kaduseus-green.png"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 shrink-0 object-contain"
            decoding="async"
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Full Endoskopik Cerrahi
          </p>
        </div>

        <h1 className="font-[family-name:var(--font-instrument-sans)] text-[1.55rem] font-semibold leading-[1.1] tracking-[-0.03em] text-text">
          Bitmek bilmeyen{" "}
          <span className="text-accent">fıtık ağrılarınız</span> mı var?
        </h1>

        <div className="mt-3 border-l-2 border-accent/40 pl-3">
          <p className="font-[family-name:var(--font-instrument-sans)] text-sm font-medium text-text">
            Son çare değil — <span className="text-accent">tek çare</span>
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-instrument-sans)] text-lg font-semibold tracking-tight text-text">
            Full Endoskopik Tedavi
          </p>
        </div>

        <div className="mt-4">
          <a
            href="/iletisim"
            className="pointer-events-auto inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(11,107,69,0.35)] transition hover:bg-accent-glow"
          >
            Randevu Al
          </a>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-xl sm:max-w-[40rem] lg:max-w-[44rem]"
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
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
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
          4 milimetrelik bir delikten kamera ile girilip fıtıklaşan dokunun
          alınmasıdır.
        </p>
      </div>

      <div className="mt-7 flex max-w-[22rem] sm:mt-8 sm:max-w-[24rem]">
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
