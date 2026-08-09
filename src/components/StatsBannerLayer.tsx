"use client";

import type { ReactNode } from "react";
import { HOME_FALLBACK, homeImageUrl, type HomeBanner } from "@/lib/cms/home";

/**
 * Sticky alt katman — tam ekran.
 * Tedavi + galeri bu fotoğrafın üzerinden kayar.
 */
export function StatsBannerLayer({
  children,
  banner = HOME_FALLBACK.banner,
}: {
  children?: ReactNode;
  banner?: HomeBanner;
}) {
  return (
    <div className="relative grid grid-cols-1">
      <section
        id="doktor-banner"
        className="col-start-1 row-start-1 sticky top-0 z-0 h-dvh w-full self-start overflow-hidden bg-[#123524]"
        aria-label="Op. Dr. Eyüp Baykara"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={homeImageUrl(banner.image)}
          alt={banner.alt}
          width={2768}
          height={1848}
          className="h-full w-full object-cover object-[48%_center]"
          decoding="async"
          loading="lazy"
        />
      </section>

      <div className="col-start-1 row-start-1 z-10 flex w-full flex-col">
        {children}
      </div>
    </div>
  );
}
