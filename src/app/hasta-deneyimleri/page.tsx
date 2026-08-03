import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Testimonials } from "@/components/Testimonials";
import { VectorPattern } from "@/components/VectorPattern";
import { YouTubeGallery } from "@/components/YouTubeGallery";

export const metadata: Metadata = {
  title: "Hasta Deneyimleri | Op. Dr. Eyüp Baykara",
  description:
    "Full endoskopik ameliyat sonrası hasta videoları, Google ve DoktorTakvimi yorumları — gerçek iyileşme hikâyeleri.",
  alternates: { canonical: "/hasta-deneyimleri" },
};

export default function HastaDeneyimleriPage() {
  return (
    <main className="min-h-screen bg-[#f7f1e9]">
      <PageHero
        title="Hasta Deneyimleri"
        description="Ameliyat sonrası videolar ve gerçek hasta yorumları — iyileşme hikâyelerini yakından görün."
        breadcrumb={[
          { label: "Anasayfa", href: "/" },
          { label: "Hasta Deneyimleri", href: "/hasta-deneyimleri" },
        ]}
      />

      <YouTubeGallery showHeader={false} />

      <div className="relative bg-[#f7f1e9]">
        <VectorPattern tone="light" opacity={0.04} size={400} />
        <div className="relative">
          <Testimonials showHeader={false} />
        </div>
      </div>
    </main>
  );
}
