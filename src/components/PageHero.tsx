import Link from "next/link";
import type { ReactNode } from "react";
import { VectorPattern } from "@/components/VectorPattern";

export type PageHeroCrumb = {
  label: string;
  href: string;
};

export type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
  /** Sağ panelde görsel yerine özel içerik (ör. video) */
  media?: ReactNode;
  cta?: { label: string; href: string };
  breadcrumb?: PageHeroCrumb[];
  align?: "left";
};

const SITE_ORIGIN = "https://www.eyupbaykara.com";

function absoluteUrl(href: string) {
  if (href.startsWith("http")) return href;
  return `${SITE_ORIGIN}${href.startsWith("/") ? href : `/${href}`}`;
}

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt = "",
  imageFit = "cover",
  media,
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

  return (
    <section className="relative overflow-hidden" aria-labelledby="page-hero-title">
      {breadcrumbJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd),
          }}
        />
      ) : null}

      <div className="grid min-h-[40vh] grid-cols-1 md:min-h-[44vh] md:grid-cols-2">
        {/* SOL — koyu yeşil */}
        <div className="relative flex flex-col justify-center bg-[#123524] px-6 py-14 sm:px-10 md:px-14 md:py-16">
          <VectorPattern tone="dark" opacity={0.06} size={400} />

          <div className="relative z-10 max-w-xl">
            {breadcrumb && breadcrumb.length > 0 ? (
              <nav
                aria-label="Breadcrumb"
                className="mb-5 flex flex-wrap items-center gap-2 text-sm text-[#a8c3b3]"
              >
                <ol className="flex flex-wrap items-center gap-2">
                  {breadcrumb.map((crumb, i) => {
                    const isLast = i === breadcrumb.length - 1;
                    return (
                      <li key={`${crumb.href}-${crumb.label}`} className="flex items-center gap-2">
                        {i > 0 ? (
                          <span className="opacity-50" aria-hidden>
                            ›
                          </span>
                        ) : null}
                        {isLast ? (
                          <span className="text-white/90" aria-current="page">
                            {crumb.label}
                          </span>
                        ) : (
                          <Link
                            href={crumb.href}
                            className="transition hover:text-white"
                          >
                            {crumb.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>
            ) : null}

            {eyebrow ? (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#4ea67d] sm:text-sm">
                {eyebrow}
              </p>
            ) : null}

            <h1
              id="page-hero-title"
              className="font-[family-name:var(--font-instrument-sans)] text-4xl font-semibold leading-tight tracking-tight text-[#fdfaf5] md:text-5xl"
            >
              {title}
            </h1>

            {description ? (
              <p className="mt-5 text-base leading-relaxed text-[#c9dccf] md:text-lg">
                {description}
              </p>
            ) : null}

            {cta ? (
              <div className="mt-8">
                <Link
                  href={cta.href}
                  className="inline-flex items-center justify-center rounded-full bg-[#fdfaf5] px-7 py-3.5 text-sm font-semibold text-[#123524] transition hover:bg-white"
                >
                  {cta.label}
                </Link>
              </div>
            ) : null}
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kaduseus-green.png"
            alt=""
            aria-hidden
            width={96}
            height={96}
            className="pointer-events-none absolute -bottom-6 right-6 w-24 opacity-10"
          />
        </div>

        {/* SAĞ — media / görsel / krem pattern */}
        <div
          className={`relative min-h-[240px] md:min-h-full ${
            media || imageFit === "contain" ? "bg-[#123524]" : "bg-[#f7f1e9]"
          }`}
        >
          {media ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#123524] p-5 sm:p-7 md:p-8">
              <VectorPattern tone="dark" opacity={0.05} size={400} />
              <div className="relative z-10 w-full max-w-xl">{media}</div>
            </div>
          ) : image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={imageAlt}
              width={1200}
              height={800}
              className={`absolute inset-0 h-full w-full ${
                imageFit === "contain" ? "object-contain" : "object-cover"
              }`}
            />
          ) : (
            <div className="absolute inset-0 bg-[#f7f1e9]">
              <VectorPattern tone="light" opacity={0.08} size={400} />
            </div>
          )}
          {!media ? (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-[#123524]/35 to-transparent md:block"
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
