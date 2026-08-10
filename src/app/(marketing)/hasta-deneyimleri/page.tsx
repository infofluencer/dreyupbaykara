import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Testimonials } from "@/components/Testimonials";
import { VectorPattern } from "@/components/VectorPattern";
import { YouTubeGallery } from "@/components/YouTubeGallery";
import { CmsSections } from "@/components/cms/CmsSections";
import { PAGE_SEO } from "@/data/seo";
import { getPublishedPage } from "@/lib/cms/content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublishedPage("/hasta-deneyimleri");
  const seo = PAGE_SEO.hastaDeneyimleri;
  return {
    title: content?.seo_title || seo.title,
    description: content?.seo_description || seo.description,
    alternates: {
      canonical: content?.canonical_url || "/hasta-deneyimleri",
    },
  };
}

export default async function HastaDeneyimleriPage() {
  const content = await getPublishedPage("/hasta-deneyimleri");
  return (
    <main className="min-h-screen bg-[#f7f1e9]">
      <PageHero
        title={content?.title || "Hasta Deneyimleri"}
        description={
          content?.excerpt || PAGE_SEO.hastaDeneyimleri.snippet
        }
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
      {content?.content_sections.length ? (
        <section className="bg-[#f7f1e9] px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <CmsSections sections={content.content_sections} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
