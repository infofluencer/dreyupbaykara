"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import { motion, useMotionValueEvent, useTransform } from "framer-motion";
import { HomeDoctorCard } from "./HomeDoctorCard";
import { HomeTreatmentCards } from "./HomeTreatmentCards";
import { TreatmentSection } from "./TreatmentSection";
import { TreatmentArchive } from "@/components/TreatmentArchive";
import { Testimonials } from "@/components/Testimonials";
import { StatsBannerLayer } from "@/components/StatsBannerLayer";
import { VideoGallery } from "@/components/VideoGallery";
import { LeadForm } from "@/components/LeadForm";
import { YouTubeGallery } from "@/components/YouTubeGallery";
import { HomeBlogSection } from "@/components/HomeBlogSection";
import { VectorPattern } from "@/components/VectorPattern";
import { useHomeProgress } from "./useHomeProgress";

const SpineScene = dynamic(() => import("./SpineScene"), { ssr: false });

/** Mobil: hero solduktan sonra iskelet mount */
const MOBILE_SPINE_LOAD = 0.32;
/** Mobil: kamera/fıtık detayı bu progress'ten sonra başlar (öncesi default duruş) */
const MOBILE_DETAIL_START = 0.52;

function mapSceneProgress(raw: number, isDesktop: boolean): number {
  if (isDesktop) return raw;
  if (raw <= MOBILE_DETAIL_START) return 0;
  return Math.min(1, (raw - MOBILE_DETAIL_START) / (1 - MOBILE_DETAIL_START));
}

export default function Home() {
  const wrapperRef = useRef<HTMLElement>(null);
  const [showSpineScene, setShowSpineScene] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { progressRef, scrollYProgress } = useHomeProgress(wrapperRef);
  /** 3D sahneye giden progress — mobilde detay gecikmeli */
  const sceneProgressRef = useRef(0);

  const textOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.35], [0, -80]);
  const textPE = useTransform(scrollYProgress, (v) =>
    v > 0.3 ? "none" : "auto",
  );

  const flashOpacity = useTransform(scrollYProgress, [0.82, 1], [0, 1]);
  // Mobilde model, hero tamamen solduktan sonra belirir
  const mobileSpineOpacity = useTransform(
    scrollYProgress,
    [0.32, 0.44],
    [0, 1],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Raw scroll → scene progress (mobilde default hold + gecikmeli detay)
  useEffect(() => {
    let raf = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      sceneProgressRef.current = mapSceneProgress(
        progressRef.current,
        isDesktop,
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [isDesktop, progressRef]);

  // Desktop: idle sonrası model. Mobil: hero solduktan sonra.
  useEffect(() => {
    let cancelled = false;
    let idleId = 0;
    let timeoutId = 0;

    const enable = () => {
      if (!cancelled) setShowSpineScene(true);
    };

    if (isDesktop) {
      const win = window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
        cancelIdleCallback?: (id: number) => void;
      };

      if (typeof win.requestIdleCallback === "function") {
        idleId = win.requestIdleCallback(enable, { timeout: 1200 });
      } else {
        timeoutId = window.setTimeout(enable, 450);
      }

      return () => {
        cancelled = true;
        if (idleId && typeof win.cancelIdleCallback === "function") {
          win.cancelIdleCallback(idleId);
        }
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [isDesktop]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (isDesktop) return;
    if (value >= MOBILE_SPINE_LOAD) setShowSpineScene(true);
  });

  return (
    <>
      <section
        id="home"
        ref={wrapperRef}
        className="relative h-[280vh] bg-bg max-lg:h-[340vh]"
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

          {/* Tek full-bleed canvas — mobilde opacity ile gelir, kesilmez */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-[8]"
            style={isDesktop ? undefined : { opacity: mobileSpineOpacity }}
          >
            {showSpineScene ? (
              <SpineScene progressRef={sceneProgressRef} />
            ) : null}
          </motion.div>

          {/* ── Desktop doctor card (right rail) ── */}
          <HomeDoctorCard style={{ opacity: textOpacity, y: textY }} />

          {/* ── Desktop copy (left) ── */}
          <motion.div
            suppressHydrationWarning
            style={{
              opacity: textOpacity,
              y: textY,
            }}
            className="pointer-events-none absolute inset-0 z-10 hidden items-center pt-32 lg:flex"
          >
            <div className="flex w-full justify-start pl-10 pr-[48%] xl:pl-12">
              <HomeTreatmentCards pointerEvents={textPE} />
            </div>
          </motion.div>

          {/* ── Mobile copy + doctor card ── */}
          <motion.div
            suppressHydrationWarning
            style={{
              opacity: textOpacity,
              y: textY,
            }}
            className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pb-3 pt-[4.75rem] lg:hidden"
          >
            <div className="flex h-[calc(100dvh-5.25rem)] flex-col rounded-[1.5rem] bg-[#fdfaf5] p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
              <HomeTreatmentCards pointerEvents={textPE} compact />
              <div className="mt-auto pt-4">
                <HomeDoctorCard mobile />
              </div>
            </div>
          </motion.div>

          <motion.div
            suppressHydrationWarning
            style={{
              opacity: flashOpacity,
              background:
                "radial-gradient(circle at center, rgba(11,107,69,0.16), #fdfaf5 72%)",
            }}
            className="pointer-events-none absolute inset-0 z-[4]"
            aria-hidden="true"
          />
        </div>
      </section>

      {/* Doktor + Instagram — tek zemin, tek pattern */}
      <div className="relative z-10 bg-[#f7f1e9]">
        <VectorPattern tone="light" opacity={0.045} size={400} />
        <div className="relative">
          <TreatmentSection />
          <LeadForm />
          <VideoGallery />
        </div>
      </div>

      <StatsBannerLayer>
        {/* Tedavi + yorumlar — tek krem zemin, tek pattern (sert geçiş olmasın) */}
        <div className="relative z-20 rounded-b-[2rem] bg-[#f7f1e9] md:rounded-b-[2.5rem]">
          <VectorPattern
            tone="light"
            opacity={0.045}
            size={400}
            className="rounded-b-[2rem] md:rounded-b-[2.5rem]"
          />
          <div className="relative">
            <TreatmentArchive />
            <Testimonials />
          </div>
        </div>
        {/* Fotoğrafın tam ekran sticky penceresi */}
        <div className="pointer-events-none h-dvh w-full shrink-0" aria-hidden />
        <YouTubeGallery />
        <HomeBlogSection />
      </StatsBannerLayer>
    </>
  );
}
