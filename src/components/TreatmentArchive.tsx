"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { treatments } from "@/data/treatments";

const ARCHIVE_ITEMS = treatments.map((item) => ({
  id: item.slug,
  title: item.h1,
  description: item.heroSubtitle,
  image: item.image,
  href: `/tedaviler/${item.slug}`,
}));

export function TreatmentArchive() {
  return (
    <section
      id="tedavi-arsivi"
      className="relative px-6 pb-6 pt-6 md:px-10 md:pb-8 md:pt-8 lg:px-16"
    >
      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 text-center"
        >
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-3xl font-semibold tracking-tight text-[#123524] sm:text-4xl">
            Full endoskopik tedavi alanları
          </h2>
        </motion.div>

        <div className="relative flex flex-col gap-8">
          {ARCHIVE_ITEMS.map((item, i) => (
            <article
              key={item.id}
              className="relative flex flex-col gap-6 overflow-hidden rounded-[2rem] border border-[#0b6b45]/10 bg-white p-5 shadow-[0_20px_50px_rgba(18,53,36,0.08)] md:sticky md:top-20 md:p-6 lg:flex-row lg:items-stretch lg:gap-10 lg:p-7"
              style={{ zIndex: i + 1 }}
            >
              <div className="relative w-full shrink-0 overflow-hidden rounded-[1.5rem] bg-[#123524] aspect-[3/2] lg:aspect-auto lg:min-h-[22rem] lg:w-[52%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt=""
                  width={1000}
                  height={667}
                  className="absolute inset-0 h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-7 px-1 pb-3 pt-1 sm:px-3 lg:py-4 lg:pr-6">
                <div>
                  <h3 className="font-[family-name:var(--font-instrument-sans)] text-[1.75rem] font-semibold leading-snug text-[#123524] sm:text-3xl">
                    {item.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#466254] sm:text-base">
                    {item.description}
                  </p>
                </div>

                <div>
                  <Link
                    href={item.href}
                    className="inline-flex items-center justify-center rounded-full bg-[#0b6b45] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#085436]"
                  >
                    İncele
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
