"use client";

import { TreatmentSection } from "./TreatmentSection";
import { TreatmentArchive } from "@/components/TreatmentArchive";
import { Testimonials } from "@/components/Testimonials";
import { StatsBannerLayer } from "@/components/StatsBannerLayer";
import { VideoGallery } from "@/components/VideoGallery";
import { LeadForm } from "@/components/LeadForm";
import { YouTubeGallery } from "@/components/YouTubeGallery";
import { HomeBlogSection } from "@/components/HomeBlogSection";
import { VectorPattern } from "@/components/VectorPattern";
import { HOME_FALLBACK, type HomeSections } from "@/lib/cms/home";

export default function HomeBelowFold({
  sections = HOME_FALLBACK,
}: {
  sections?: HomeSections;
}) {
  return (
    <>
      <div className="relative z-10 bg-[#f7f1e9]">
        <VectorPattern tone="light" opacity={0.045} size={400} />
        <div className="relative">
          <TreatmentSection whyUs={sections.whyUs} />
          <LeadForm copy={sections.leadForm} />
          <VideoGallery copy={sections.instagram} />
        </div>
      </div>

      <StatsBannerLayer banner={sections.banner}>
        <div className="relative z-20 rounded-b-[2rem] bg-[#f7f1e9] md:rounded-b-[2.5rem]">
          <VectorPattern
            tone="light"
            opacity={0.045}
            size={400}
            className="rounded-b-[2rem] md:rounded-b-[2.5rem]"
          />
          <div className="relative">
            <TreatmentArchive />
            <Testimonials copy={sections.testimonials} />
          </div>
        </div>
        <div className="pointer-events-none h-dvh w-full shrink-0" aria-hidden />
        <YouTubeGallery copy={sections.youtube} />
        <HomeBlogSection copy={sections.blog} />
      </StatsBannerLayer>
    </>
  );
}
