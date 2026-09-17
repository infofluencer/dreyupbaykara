import type { Metadata } from "next";
import HomePage from "@/components/home/Home";
import { SPINE_GLB } from "@/components/home/spine-asset";
import { PAGE_SEO, SITE_KEYWORDS } from "@/data/seo";
import { getPublishedPage, mediaPublicUrl } from "@/lib/cms/content";
import { getHomeSections } from "@/lib/cms/home-server";

export const revalidate = 120;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://endoskopikbelameliyati.com"
).replace(/\/$/, "");

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublishedPage("/");
  const seo = PAGE_SEO.home;
  const image =
    mediaPublicUrl(content?.featured_image_path) || "/hero/hero_dr.webp";
  // Index için güçlendirilmiş statik SEO öncelikli (CMS zayıf override etmesin).
  const title = seo.title;
  const description = seo.description;

  return {
    title,
    description,
    keywords: [...SITE_KEYWORDS],
    alternates: {
      canonical: content?.canonical_url || "/",
      languages: {
        tr: SITE_URL,
        "tr-TR": SITE_URL,
        "x-default": SITE_URL,
      },
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: SITE_URL,
      siteName: "Op. Dr. Eyüp Baykara | Endoskopik Bel Ameliyatı",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function Home() {
  const sections = await getHomeSections();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Op. Dr. Eyüp Baykara | Endoskopik Bel Ameliyatı",
        description: PAGE_SEO.home.description,
        inLanguage: "tr-TR",
        publisher: { "@id": `${SITE_URL}/#physician` },
      },
      {
        "@type": "Physician",
        "@id": `${SITE_URL}/#physician`,
        name: "Op. Dr. Eyüp Baykara",
        url: SITE_URL,
        image: `${SITE_URL}/hero/hero_dr.webp`,
        medicalSpecialty: "Neurosurgery",
        description: PAGE_SEO.home.description,
        telephone: "+905307837224",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Silivri",
          addressRegion: "İstanbul",
          addressCountry: "TR",
          streetAddress: "Özel Silivri Anadolu Hastanesi",
        },
        worksFor: {
          "@type": "Hospital",
          name: "Özel Silivri Anadolu Hastanesi",
        },
      },
      {
        "@type": "MedicalBusiness",
        "@id": `${SITE_URL}/#business`,
        name: "Endospine İstanbul — Op. Dr. Eyüp Baykara",
        url: SITE_URL,
        image: `${SITE_URL}/hero/hero_dr.webp`,
        telephone: "+905307837224",
        priceRange: "$$",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Silivri",
          addressRegion: "İstanbul",
          addressCountry: "TR",
        },
        areaServed: {
          "@type": "City",
          name: "İstanbul",
        },
      },
    ],
  };

  return (
    <main className="bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/*
        `crossOrigin` şart: three.js FileLoader isteği cors + same-origin
        kimlik modunda gidiyor, eşleşmezse tarayıcı modeli ikinci kez indiriyor.
      */}
      <link
        rel="preload"
        href={SPINE_GLB}
        as="fetch"
        crossOrigin="anonymous"
        media="(min-width: 1024px)"
      />
      <HomePage sections={sections} />
    </main>
  );
}
