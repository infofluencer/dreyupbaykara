import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { VectorPattern } from "@/components/VectorPattern";
import { TrackedWhatsAppLink } from "@/components/TrackedWhatsAppLink";

export type PageHeroCrumb = {
  label: string;
  href: string;
};

export type PageHeroProps = {
  title: string;
  description?: string;
  /** @deprecated Görsel artık hero içinde değil; içerikte kullanılabilir */
  image?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
  /** @deprecated Medya artık hero içinde değil */
  media?: ReactNode;
  cta?: { label: string; href: string } | false;
  breadcrumb?: PageHeroCrumb[];
  align?: "left";
};

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://endoskopikbelameliyati.com";

function absoluteUrl(href: string) {
  if (href.startsWith("http")) return href;
  return `${SITE_ORIGIN}${href.startsWith("/") ? href : `/${href}`}`;
}

export function PageHero({
  title,
  description,
  cta,
  breadcrumb,
}: PageHeroProps) {
  const breadcrumbJsonLd =
    breadcrumb && breadcrumb.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumb.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            item: absoluteUrl(item.href),
          })),
        }
      : null;

  const resolvedCta = cta === false ? null : cta === undefined ? "whatsapp" : cta;

  return (
    <section
      className="relative overflow-hidden bg-[#dce9d5]"
      aria-labelledby="page-hero-title"
    >
      {breadcrumbJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd),
          }}
        />
      ) : null}

      <VectorPattern tone="light" opacity={0.05} size={420} />
      <div className="relative mx-auto max-w-[90rem] px-5 pb-12 pt-8 sm:px-8 md:pb-16 lg:px-12">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav
            aria-label="Breadcrumb"
            className="mb-14 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#17372a]/55"
          >
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumb.map((crumb, i) => {
                const isLast = i === breadcrumb.length - 1;
                return (
                  <li
                    key={`${crumb.href}-${crumb.label}`}
                    className="flex items-center gap-2"
                  >
                    {i > 0 ? <span aria-hidden>/</span> : null}
                    {isLast ? (
                      <span className="text-[#17372a]/80" aria-current="page">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="transition hover:text-[#17372a]"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : (
          <div className="mb-14" aria-hidden />
        )}

        <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <h1
              id="page-hero-title"
              className="max-w-4xl font-[family-name:var(--font-instrument-sans)] text-[clamp(2.35rem,7.2vw,7.4rem)] font-medium leading-[0.92] tracking-[-0.055em] text-[#17372a]"
            >
              {title}
            </h1>
          </div>

          {description || resolvedCta ? (
            <div className="max-w-xl pb-2 lg:justify-self-end">
              {description ? (
                <p className="text-base leading-7 text-[#17372a]/70 sm:text-lg">
                  {description}
                </p>
              ) : null}
              {resolvedCta === "whatsapp" ? (
                <TrackedWhatsAppLink
                  channel="hero"
                  className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#17372a] py-2 pl-6 pr-2 text-sm font-semibold text-white transition hover:bg-[#0b6b45]"
                >
                  Randevu al
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#73df68] text-[#17372a]">
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </span>
                </TrackedWhatsAppLink>
              ) : resolvedCta ? (
                resolvedCta.href.startsWith("http") ? (
                  <a
                    href={resolvedCta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#17372a] py-2 pl-6 pr-2 text-sm font-semibold text-white transition hover:bg-[#0b6b45]"
                  >
                    {resolvedCta.label}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#73df68] text-[#17372a]">
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </span>
                  </a>
                ) : (
                  <Link
                    href={resolvedCta.href}
                    className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#17372a] py-2 pl-6 pr-2 text-sm font-semibold text-white transition hover:bg-[#0b6b45]"
                  >
                    {resolvedCta.label}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#73df68] text-[#17372a]">
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </span>
                  </Link>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
