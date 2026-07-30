"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { motion, useTransform } from "framer-motion";
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

export default function Home() {
  const wrapperRef = useRef<HTMLElement>(null);
  const { progressRef, scrollYProgress } = useHomeProgress(wrapperRef);

  const textOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.35], [0, -80]);
  const textPE = useTransform(scrollYProgress, (v) =>
    v > 0.3 ? "none" : "auto",
  );

  const flashOpacity = useTransform(scrollYProgress, [0.82, 1], [0, 1]);

  return (
    <>
      <section
        id="home"
        ref={wrapperRef}
        className="relative h-[280vh] bg-bg"
        aria-label="Ana sayfa bölümü"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-bg">
          <div className="absolute inset-0 z-[1] bg-bg">
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              <div className="absolute left-1/4 top-1/4 h-[55vh] w-[55vh] rounded-full bg-accent/15 blur-[120px]" />
              <div className="absolute bottom-0 left-0 h-1/3 w-full bg-gradient-to-t from-bg to-transparent" />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-[8]">
            <SpineScene progressRef={progressRef} />
          </div>

          <HomeDoctorCard style={{ opacity: textOpacity, y: textY }} />

          <motion.div
            style={{
              opacity: textOpacity,
              y: textY,
            }}
            className="pointer-events-none absolute inset-0 z-10 flex items-center pt-28 sm:pt-32"
          >
            <div className="flex w-full justify-start pl-4 pr-[48%] sm:pl-6 md:pl-8 lg:pl-10 xl:pl-12">
              <HomeTreatmentCards pointerEvents={textPE} />
            </div>
          </motion.div>

          <motion.div
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
        <div className="pointer-events-none h-screen w-full shrink-0" aria-hidden />
        <YouTubeGallery />
        <HomeBlogSection />
      </StatsBannerLayer>
    </>
  );
}
