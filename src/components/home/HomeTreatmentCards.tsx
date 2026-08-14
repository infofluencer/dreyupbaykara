"use client";

import { motion, type MotionValue } from "framer-motion";
import { HOME_FALLBACK, type HomeHero } from "@/lib/cms/home";

interface HomeTreatmentCardsProps {
  hero?: HomeHero;
  pointerEvents?: MotionValue<"auto" | "none">;
  /** Compact typography/spacing for mobile hero only */
  compact?: boolean;
}

export function HomeTreatmentCards({
  hero = HOME_FALLBACK.hero,
  pointerEvents,
  compact = false,
}: HomeTreatmentCardsProps) {
  if (compact) {
    return (
      <motion.div
        className="flex w-full shrink-0 flex-col"
        style={pointerEvents ? { pointerEvents } : undefined}
        initial={false}
      >
        <div className="mb-2 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kaduseus-green.png"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 shrink-0 object-contain"
            decoding="async"
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            {hero.kicker}
          </p>
        </div>

        <h1 className="font-[family-name:var(--font-instrument-sans)] text-[1.55rem] font-semibold leading-[1.1] tracking-[-0.03em] text-text">
          {hero.titleBefore}{" "}
          <span className="text-accent">{hero.titleHighlight}</span>{" "}
          {hero.titleAfter}
        </h1>

        <div className="mt-2 border-l-2 border-accent/40 pl-3">
          <p className="font-[family-name:var(--font-instrument-sans)] text-sm font-medium text-text">
            {hero.line1}{" "}
            <span className="text-accent">{hero.line1Highlight}</span>
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-instrument-sans)] text-lg font-semibold tracking-tight text-text">
            {hero.line2}
          </p>
          <p className="mt-2.5 text-sm leading-relaxed text-text-muted">
            {hero.description}
          </p>
        </div>

        <div className="mt-4">
          <a
            href={hero.ctaHref}
            className="pointer-events-auto inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(11,107,69,0.35)] transition hover:bg-accent-glow"
          >
            {hero.ctaLabel}
          </a>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-xl sm:max-w-[40rem] lg:max-w-[44rem]"
      style={pointerEvents ? { pointerEvents } : undefined}
      initial={false}
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
          {hero.kicker}
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
        {hero.titleBefore}
        <br />
        <span className="text-accent">{hero.titleHighlight}</span>
        <br />
        {hero.titleAfter}
      </h1>

      <div className="mt-5 max-w-lg border-l-2 border-accent/40 pl-4 sm:mt-6 sm:pl-5">
        <p className="font-[family-name:var(--font-instrument-sans)] text-base font-medium leading-snug text-text sm:text-lg">
          {hero.line1} <span className="text-accent">{hero.line1Highlight}</span>
        </p>
        <p className="mt-1 font-[family-name:var(--font-instrument-sans)] text-xl font-semibold tracking-tight text-text sm:text-2xl">
          {hero.line2}
        </p>
        <p className="mt-2.5 text-sm leading-relaxed text-text-muted sm:text-[15px]">
          {hero.description}
        </p>
      </div>

      <div className="mt-7 flex max-w-[22rem] sm:mt-8 sm:max-w-[24rem]">
        <a
          href={hero.ctaHref}
          className="pointer-events-auto inline-flex min-w-[15rem] items-center justify-center rounded-lg bg-accent px-10 py-3.5 text-base font-semibold text-white shadow-[0_0_24px_rgba(11,107,69,0.35)] transition hover:bg-accent-glow"
        >
          {hero.ctaLabel}
        </a>
      </div>
    </motion.div>
  );
}
