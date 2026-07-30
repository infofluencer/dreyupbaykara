"use client";

import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import type { TreatmentComparison } from "@/data/treatments";

export function ComparisonCard({ data }: { data?: TreatmentComparison }) {
  if (!data?.open?.length || !data?.endoscopic?.length) return null;

  return (
    <section aria-labelledby="comparison-title">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#0b6b45]/70">
        Karşılaştırma
      </p>
      <h2
        id="comparison-title"
        className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight text-[#123524] sm:text-3xl"
      >
        Farkı görün
      </h2>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 grid overflow-hidden rounded-2xl ring-1 ring-black/10 md:grid-cols-2"
      >
        <div className="bg-white p-6 sm:p-8">
          <h3 className="mb-5 font-[family-name:var(--font-instrument-sans)] text-lg font-semibold text-[#8a8a8a]">
            Geleneksel Açık Ameliyat
          </h3>
          <ul className="space-y-3">
            {data.open.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-[15px] leading-6 text-[#466254]"
              >
                <X
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#123524] p-6 text-white sm:p-8">
          <h3 className="mb-5 font-[family-name:var(--font-instrument-sans)] text-lg font-semibold text-[#4ea67d]">
            Full Endoskopik Yöntem
          </h3>
          <ul className="space-y-3">
            {data.endoscopic.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-[15px] leading-6 text-[#e8f2ec]"
              >
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#4ea67d]"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}
