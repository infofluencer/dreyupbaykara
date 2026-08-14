import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CmsSections } from "@/components/cms/CmsSections";
import { PageHero } from "@/components/PageHero";
import { VectorPattern } from "@/components/VectorPattern";
import { PAGE_SEO } from "@/data/seo";
import { treatments } from "@/data/treatments";
import { getPublishedPage } from "@/lib/cms/content";

const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://endoskopikbelameliyati.com"
).replace(/\/$/, "");

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublishedPage("/hizmetler");
  const seo = PAGE_SEO.hizmetler;
  return {
    title: content?.seo_title || seo.title,
    description: content?.seo_description || seo.description,
    alternates: { canonical: content?.canonical_url || "/hizmetler" },
  };
}

export default async function HizmetlerPage() {
  const content = await getPublishedPage("/hizmetler");
  const seo = PAGE_SEO.hizmetler;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: content?.title || "Hizmetlerimiz",
    description: content?.seo_description || seo.description,
    url: `${SITE_ORIGIN}/hizmetler`,
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f7ef] text-[#17372a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        title={content?.title || "Hizmetlerimiz"}
        description={content?.excerpt || seo.snippet}
        breadcrumb={[
          { label: "Anasayfa", href: "/" },
          { label: "Hizmetlerimiz", href: "/hizmetler" },
        ]}
      />

      <section className="relative px-5 py-16 sm:px-8 md:py-24 lg:px-12">
        <VectorPattern tone="light" opacity={0.04} size={400} />
        <div className="relative mx-auto max-w-7xl">
          {content?.content_sections.length ? (
            <div className="mb-12 max-w-3xl">
              <CmsSections sections={content.content_sections} />
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            {treatments.map((item) => (
              <Link
                key={item.slug}
                href={`/tedaviler/${item.slug}`}
                className="group relative min-h-[22rem] overflow-hidden rounded-[1.75rem]"
              >
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 45vw, 92vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#123524] via-[#123524]/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    {item.navTitle}
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-white/80">
                    {item.heroSubtitle}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
                    İncele
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
