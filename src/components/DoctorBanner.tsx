"use client";

import { motion } from "framer-motion";

export function DoctorBanner() {
  return (
    <div
      id="doktor-banner"
      className="relative z-10 w-full"
      aria-label="Op. Dr. Eyüp Baykara"
    >
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/banner_dr.jpg"
          alt="Op. Dr. Eyüp Baykara — ameliyathane"
          className="block h-[min(78vh,48rem)] w-full object-cover object-[72%_center] sm:h-[min(85vh,52rem)]"
          loading="lazy"
          decoding="async"
        />
      </motion.div>
    </div>
  );
}
