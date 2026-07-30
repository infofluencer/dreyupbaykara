"use client";

import type { ReactNode } from "react";

/**
 * Sticky alt katman — tam ekran.
 * Tedavi + galeri bu fotoğrafın üzerinden kayar.
 */
export function StatsBannerLayer({ children }: { children?: ReactNode }) {
  return (
    <div className="relative grid grid-cols-1">
      <section
        id="doktor-banner"
        className="col-start-1 row-start-1 sticky top-0 z-0 h-screen w-full self-start overflow-hidden bg-[#123524]"
        aria-label="Op. Dr. Eyüp Baykara"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/banner_dr.jpg"
          alt="Op. Dr. Eyüp Baykara — ameliyathane"
          width={1916}
          height={821}
          className="h-full w-full object-cover object-[72%_center]"
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
