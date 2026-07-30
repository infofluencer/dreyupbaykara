import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getTreatment,
  treatments,
} from "@/data/treatments";
import { TreatmentDetailView } from "@/components/treatments/TreatmentDetailView";

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
  const t = getTreatment(slug);
  if (!t) return {};

  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: `/tedaviler/${t.slug}` },
    openGraph: {
      title: t.metaTitle,
      description: t.metaDescription,
      images: [t.image],
    },
  };
}

export default async function TreatmentPage({ params }: PageProps) {
  const { slug } = await params;
  const treatment = getTreatment(slug);
  if (!treatment) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: treatment.h1,
    description: treatment.metaDescription,
    howPerformed: "Full endoskopik tam kapalı minimal invaziv cerrahi",
    bodyLocation: treatment.bodyLocation,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TreatmentDetailView treatment={treatment} />
    </>
  );
}
