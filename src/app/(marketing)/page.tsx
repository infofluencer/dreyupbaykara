import type { Metadata } from "next";
import HomePage from "@/components/home/Home";
import { PAGE_SEO } from "@/data/seo";
import { getPublishedPage, mediaPublicUrl } from "@/lib/cms/content";
import { getHomeSections } from "@/lib/cms/home-server";
import { homeImageUrl } from "@/lib/cms/home";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublishedPage("/");
  const seo = PAGE_SEO.home;
  const image =
    mediaPublicUrl(content?.featured_image_path) || "/hero/hero_dr.webp";

  return {
    title: content?.seo_title || seo.title,
    description: content?.seo_description || content?.excerpt || seo.description,
    alternates: { canonical: content?.canonical_url || "/" },
    openGraph: {
      title: content?.seo_title || content?.title || seo.title,
      description:
        content?.seo_description || content?.excerpt || seo.description,
      images: [image],
    },
  };
}

export default async function Home() {
  const sections = await getHomeSections();
  const doctorImg = homeImageUrl(sections.hero.doctorImage);

  return (
    <main className="bg-bg">
      <link rel="preload" href={doctorImg} as="image" fetchPriority="high" />
      <HomePage sections={sections} />
    </main>
  );
}
