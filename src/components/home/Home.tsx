"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import { motion, useTransform } from "framer-motion";
import { HomeDoctorCard } from "./HomeDoctorCard";
import { HomeTreatmentCards } from "./HomeTreatmentCards";
import { useHomeProgress } from "./useHomeProgress";
import { HOME_FALLBACK, type HomeSections } from "@/lib/cms/home";

const SpineScene = dynamic(() => import("./SpineScene"), { ssr: false });
const HomeBelowFold = dynamic(() => import("./HomeBelowFold"));

/** Desktop: kırmızı fıtık/kamera detayı biraz daha geç başlasın */
const DESKTOP_DETAIL_START = 0.18;

function mapSceneProgress(raw: number): number {
  if (raw <= DESKTOP_DETAIL_START) return 0;
  return Math.min(1, (raw - DESKTOP_DETAIL_START) / (1 - DESKTOP_DETAIL_START));
}

export default function Home({
  sections = HOME_FALLBACK,
}: {
  sections?: HomeSections;
}) {
  const wrapperRef = useRef<HTMLElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const { progressRef, scrollYProgress } = useHomeProgress(wrapperRef);
  const sceneProgressRef = useRef(0);

  const textOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.35], [0, -80]);
  const textPE = useTransform(scrollYProgress, (v) =>
    v > 0.3 ? "none" : "auto",
  );

  const flashOpacity = useTransform(scrollYProgress, [0.82, 1], [0, 1]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      sceneProgressRef.current = 0;
      return;
    }
    let raf = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      sceneProgressRef.current = mapSceneProgress(progressRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [isDesktop, progressRef]);

  return (
    <>
      <section
        id="home"
        ref={wrapperRef}
        className="relative h-dvh bg-bg lg:h-[280vh]"
        aria-label="Ana sayfa bölümü"
      >
        <div className="sticky top-0 h-dvh w-full overflow-hidden bg-bg">
          <div className="absolute inset-0 z-[1] bg-bg">
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              <div className="absolute left-1/4 top-1/4 h-[55dvh] w-[55dvh] rounded-full bg-accent/15 blur-[120px]" />
              <div className="absolute bottom-0 left-0 h-1/3 w-full bg-gradient-to-t from-bg to-transparent" />
            </div>
          </div>

          {isDesktop ? (
            <div className="pointer-events-none absolute inset-0 z-[8]">
              <SpineScene progressRef={sceneProgressRef} />
            </div>
          ) : null}

          <HomeDoctorCard
            hero={sections.hero}
            style={{ opacity: textOpacity, y: textY }}
          />

          <motion.div
            suppressHydrationWarning
            style={{
              opacity: textOpacity,
              y: textY,
            }}
            className="pointer-events-none absolute inset-0 z-10 hidden items-center pt-32 lg:flex"
          >
            <div className="flex w-full justify-start pl-10 pr-[48%] xl:pl-12">
              <HomeTreatmentCards hero={sections.hero} pointerEvents={textPE} />
            </div>
          </motion.div>

          <motion.div
            suppressHydrationWarning
            className="pointer-events-none absolute inset-0 z-10 flex flex-col px-3 pb-3 pt-[6.75rem] lg:hidden"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 rounded-[1.5rem] bg-[#fdfaf5] p-3 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
              <HomeDoctorCard hero={sections.hero} mobile />
              <HomeTreatmentCards
                hero={sections.hero}
                pointerEvents={textPE}
                compact
              />
            </div>
          </motion.div>

          <motion.div
            suppressHydrationWarning
            style={{
              opacity: flashOpacity,
              background:
                "radial-gradient(circle at center, rgba(11,107,69,0.16), #fdfaf5 72%)",
            }}
            className="pointer-events-none absolute inset-0 z-[4] hidden lg:block"
            aria-hidden="true"
          />
        </div>
      </section>

      <HomeBelowFold sections={sections} />
    </>
  );
}
