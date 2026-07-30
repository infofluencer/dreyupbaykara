"use client";

import { motion } from "framer-motion";
import type { TreatmentProcessStep } from "@/data/treatments";

export function ProcessSteps({ steps }: { steps?: TreatmentProcessStep[] }) {
  if (!steps?.length) return null;

  return (
    <section aria-labelledby="process-steps-title">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#0b6b45]/70">
        Süreç
      </p>
      <h2
        id="process-steps-title"
        className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight text-[#123524] sm:text-3xl"
      >
        Tedavi Süreci
      </h2>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              duration: 0.45,
              delay: Math.min(i, 4) * 0.05,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
          >
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#0b6b45] text-sm font-bold text-white">
              {i + 1}
            </span>
            <h3 className="font-[family-name:var(--font-instrument-sans)] text-base font-semibold text-[#123524]">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#466254]">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
