"use client";

import { motion } from "framer-motion";
import {
  TREATMENT_ICONS,
  type TreatmentAdvantage,
} from "@/data/treatments";

export function AdvantageCards({ items }: { items?: TreatmentAdvantage[] }) {
  if (!items?.length) return null;

  return (
    <section className="py-12 md:py-16" aria-label="Avantajlar">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {items.map((item, i) => {
          const Icon = TREATMENT_ICONS[item.icon] ?? TREATMENT_ICONS.Check;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.45,
                delay: Math.min(i, 4) * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex flex-col items-center gap-3 rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b6b45]/10">
                <Icon className="h-6 w-6 text-[#0b6b45]" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-[#123524]">
                {item.title}
              </span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
