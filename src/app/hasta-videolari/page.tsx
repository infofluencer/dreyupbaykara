import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { YouTubeGallery } from "@/components/YouTubeGallery";

export const metadata: Metadata = {
  title: "Hasta Videoları | Op. Dr. Eyüp Baykara",
  description:
    "Full endoskopik bel, boyun fıtığı ve kanal darlığı ameliyatlarından hasta videoları ve başarı hikâyeleri.",
  alternates: { canonical: "/hasta-videolari" },
};

export default function HastaVideolariPage() {
  return (
    <main className="min-h-screen bg-[#fdfaf5]">
      <PageHero
        eyebrow="Video galeri"
        title="Hasta Videoları"
        description="Full endoskopik bel, boyun fıtığı ve kanal darlığı ameliyatlarından hasta videoları ve başarı hikâyeleri."
        breadcrumb={[
          { label: "Anasayfa", href: "/" },
          { label: "Hasta Videoları", href: "/hasta-videolari" },
        ]}
      />
      <YouTubeGallery showHeader={false} />
    </main>
  );
}
