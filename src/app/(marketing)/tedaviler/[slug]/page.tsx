import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getTreatment,
  treatments,
} from "@/data/treatments";
import { CmsSections } from "@/components/cms/CmsSections";
import { TreatmentDetailView } from "@/components/treatments/TreatmentDetailView";
import { getPublishedPage, mediaPublicUrl } from "@/lib/cms/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return treatments.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cms = await getPublishedPage(`/tedaviler/${slug}`);
  const t = getTreatment(slug);
  if (!t) return {};
  const image = mediaPublicUrl(cms?.featured_image_path) || t.image;

  return {
    title: cms?.seo_title || t.metaTitle,
    description: cms?.seo_description || cms?.excerpt || t.metaDescription,
    alternates: {
      canonical: cms?.canonical_url || `/tedaviler/${t.slug}`,
    },
    openGraph: {
      title: cms?.seo_title || cms?.title || t.metaTitle,
      description: cms?.seo_description || cms?.excerpt || t.metaDescription,
      images: [image],
    },
  };
}

export default async function TreatmentPage({ params }: PageProps) {
  const { slug } = await params;
  const treatment = getTreatment(slug);
  if (!treatment) notFound();
  const cms = await getPublishedPage(`/tedaviler/${slug}`);
  const effectiveTreatment = cms
    ? {
        ...treatment,
        h1: cms.title,
        heroSubtitle: cms.excerpt || treatment.heroSubtitle,
        image: mediaPublicUrl(cms.featured_image_path) || treatment.image,
        metaTitle: cms.seo_title || treatment.metaTitle,
        metaDescription: cms.seo_description || treatment.metaDescription,
      }
    : treatment;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: effectiveTreatment.h1,
    description: effectiveTreatment.metaDescription,
    howPerformed: "Full endoskopik tam kapalı minimal invaziv cerrahi",
    bodyLocation: treatment.bodyLocation,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TreatmentDetailView treatment={effectiveTreatment} />
      {cms?.content_sections.length ? (
        <section className="bg-[#f7f1e9] px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <CmsSections sections={cms.content_sections} />
          </div>
        </section>
      ) : null}
    </>
  );
}
