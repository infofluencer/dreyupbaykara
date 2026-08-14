import type { Metadata } from "next";
import HomePage from "@/components/home/Home";
import { SPINE_GLB } from "@/components/home/spine-asset";
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
      <link
        rel="preload"
        href={SPINE_GLB}
        as="fetch"
        crossOrigin="anonymous"
        media="(min-width: 1024px)"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){if(!window.matchMedia("(min-width:1024px)").matches)return;fetch("${SPINE_GLB}",{credentials:"omit",cache:"force-cache"}).catch(function(){})})();`,
        }}
      />
      <HomePage sections={sections} />
    </main>
  );
}
