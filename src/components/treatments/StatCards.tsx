"use client";

import { motion } from "framer-motion";
import type { TreatmentStat } from "@/data/treatments";

export function StatCards({ items }: { items?: TreatmentStat[] }) {
  if (!items?.length) return null;

  return (
    <section aria-label="Güven göstergeleri">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              duration: 0.4,
              delay: Math.min(i, 3) * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="rounded-2xl bg-white px-4 py-5 text-center shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md sm:px-5 sm:py-6"
          >
            <p className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight text-[#0b6b45] sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#466254] sm:text-sm sm:normal-case sm:tracking-normal">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
