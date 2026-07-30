import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Testimonials } from "@/components/Testimonials";
import { VectorPattern } from "@/components/VectorPattern";

export const metadata: Metadata = {
  title: "Hasta Hikayeleri | Op. Dr. Eyüp Baykara",
  description:
    "Google ve DoktorTakvimi üzerinden Op. Dr. Eyüp Baykara hakkında hasta yorumları ve hikâyeleri.",
  alternates: { canonical: "/hasta-hikayeleri" },
};

export default function HastaHikayeleriPage() {
  return (
    <main className="relative min-h-screen bg-[#f7f1e9]">
      <PageHero
        eyebrow="Yorumlar"
        title="Hasta Hikayeleri"
        description="Google ve DoktorTakvimi üzerinden paylaşılan gerçek hasta yorumları ve iyileşme hikâyeleri."
        breadcrumb={[
          { label: "Anasayfa", href: "/" },
          { label: "Hasta Hikayeleri", href: "/hasta-hikayeleri" },
        ]}
      />
      <div className="relative">
        <VectorPattern tone="light" opacity={0.04} size={400} />
        <div className="relative">
          <Testimonials showHeader={false} />
        </div>
      </div>
    </main>
  );
}
