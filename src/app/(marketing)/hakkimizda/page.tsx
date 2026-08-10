import type { Metadata } from "next";
import { CmsSections } from "@/components/cms/CmsSections";
import { PageCta, PageShell } from "@/components/PageShell";
import { PAGE_SEO } from "@/data/seo";
import { getPublishedPage, mediaPublicUrl } from "@/lib/cms/content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublishedPage("/hakkimizda");
  const seo = PAGE_SEO.hakkimizda;
  return {
    title: content?.seo_title || seo.title,
    description: content?.seo_description || seo.description,
    alternates: { canonical: content?.canonical_url || "/hakkimizda" },
  };
}

export default async function HakkimizdaPage() {
  const content = await getPublishedPage("/hakkimizda");
  const image =
    mediaPublicUrl(content?.featured_image_path) || "/hero/hero_dr.webp";

  return (
    <PageShell
      title={content?.title || "Op. Dr. Eyüp Baykara"}
      description={
        content?.excerpt || PAGE_SEO.hakkimizda.snippet
      }
      image={image}
      imageAlt={content?.featured_image_alt || "Op. Dr. Eyüp Baykara"}
      breadcrumb={[
        { label: "Anasayfa", href: "/" },
        { label: "Hakkımızda", href: "/hakkimizda" },
      ]}
    >
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-5 text-sm leading-7 text-[#466254] sm:text-[15px]">
          {content?.content_sections.length ? (
            <CmsSections sections={content.content_sections} />
          ) : (
            <>
              <p>
                Op. Dr. Eyüp Baykara, beyin ve sinir cerrahisi uzmanı olarak bel
                fıtığı, boyun fıtığı ve omurilik kanal darlığı tedavilerinde full
                endoskopik (tam kapalı) yöntemlere odaklanır.
              </p>
              <p>
                Tıp eğitimini Trakya Üniversitesi Tıp Fakültesinde tamamlamış;
                uzmanlık eğitimini Pamukkale Üniversitesi Beyin ve Sinir Cerrahisi
                Ana Bilim Dalında almıştır.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Full endoskopik bel fıtığı ameliyatı</li>
                <li>Full endoskopik boyun fıtığı ameliyatı</li>
                <li>Full endoskopik kanal darlığı ameliyatı</li>
                <li>Minimal invaziv omurga cerrahisi</li>
              </ul>
            </>
          )}
          <PageCta />
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-[#0b6b45]/10 bg-white shadow-[0_12px_36px_rgba(18,53,36,0.06)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={content?.featured_image_alt || "Op. Dr. Eyüp Baykara"}
            width={900}
            height={1100}
            className="aspect-[4/5] w-full object-cover object-[center_18%]"
          />
        </div>
      </div>
    </PageShell>
  );
}
