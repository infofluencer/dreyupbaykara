"use client";

import { motion } from "framer-motion";
import type { TreatmentSymptom } from "@/data/treatments";

export function SymptomCards({
  items,
  title = "Bu belirtileri yaşıyor musunuz?",
}: {
  items?: TreatmentSymptom[];
  title?: string;
}) {
  if (!items?.length) return null;

  return (
    <section aria-labelledby="symptom-cards-title">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#0b6b45]/70">
        Belirtiler
      </p>
      <h2
        id="symptom-cards-title"
        className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight text-[#123524] sm:text-3xl"
      >
        {title}
      </h2>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((item, i) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              duration: 0.45,
              delay: Math.min(i, 3) * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
          >
            <p className="text-[15px] font-medium leading-6 text-[#244233]">
              {item.text}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
