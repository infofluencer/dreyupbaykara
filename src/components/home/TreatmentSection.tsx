"use client";

import { motion, type MotionValue, type Variants } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  HOME_FALLBACK,
  homeImageUrl,
  type HomeStat,
  type HomeWhyUs,
} from "@/lib/cms/home";

function RevealText({ label, text }: { label: string; text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [progress, setProgress] = useState(0);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 → element enters bottom, 1 → element fully in view
    const p = Math.min(Math.max((vh - rect.top) / (vh * 0.55), 0), 1);
    setProgress(p);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const colored = Math.floor(progress * text.length);

  return (
    <div ref={ref}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#0b6b45]/60">
        {label}
      </p>
      <p className="font-[family-name:var(--font-instrument-sans)] text-2xl font-bold leading-snug sm:text-3xl">
        <span style={{ color: "#0b6b45" }}>{text.slice(0, colored)}</span>
        <span style={{ color: "#12352410" }}>{text.slice(colored)}</span>
      </p>
    </div>
  );
}

function useCountUp(target: number, started: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
      else setValue(target);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return value;
}

/** Her basamağı slot makinesi gibi yukarı/aşağı kaydırır */
function SlotDigit({ digit, index }: { digit: string; index: number }) {
  const [prev, setPrev] = useState(digit);
  const [current, setCurrent] = useState(digit);
  const [animating, setAnimating] = useState(false);
  const goUp = index % 2 === 0; // çift index → yukarı, tek → aşağı

  useEffect(() => {
    if (digit === current) return;
    setPrev(current);
    setCurrent(digit);
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 320);
    return () => clearTimeout(t);
  }, [digit, current]);

  return (
    <span
      className="relative inline-block overflow-hidden"
      style={{ height: "1.15em", lineHeight: "1.15em", minWidth: "0.6em" }}
    >
      {/* eski rakam çıkıyor */}
      {animating && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: animating ? (goUp ? "translateY(-100%)" : "translateY(100%)") : "translateY(0)",
            transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {prev}
        </span>
      )}
      {/* yeni rakam giriyor */}
      <span
        className="flex items-center justify-center"
        style={{
          transform: animating ? "translateY(0)" : "translateY(0)",
          animation: animating
            ? `slot-in-${goUp ? "up" : "down"} 0.32s cubic-bezier(0.22,1,0.36,1) forwards`
            : "none",
        }}
      >
        {current}
      </span>
    </span>
  );
}

function SlotDigits({ value }: { value: number }) {
  const digits = String(value).split("");
  return (
    <span className="inline-flex">
      {digits.map((d, i) => (
        <SlotDigit key={i} digit={d} index={i} />
      ))}
    </span>
  );
}

function StatIcon({ type }: { type: string }) {
  if (type === "heart") return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21C12 21 3 14.5 3 8.5a4.5 4.5 0 0 1 9-0 4.5 4.5 0 0 1 9 0c0 6-9 12.5-9 12.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M9 9c.5 1.5 1.5 2.5 3 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 21h8M12 17v4M5 3H3v3a4 4 0 0 0 4 4M19 3h2v3a4 4 0 0 1-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M7 3h10v6a5 5 0 0 1-10 0V3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}

function StatCard({ icon, value, suffix, label }: HomeStat) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const count = useCountUp(value, started, 1200);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-start gap-3 rounded-2xl border border-[#0b6b45]/10 bg-[#f8fbf9] px-5 py-5">
      <div className={`transition-colors duration-700 ${started ? "text-[#0b6b45]" : "text-[#0b6b45]/30"}`}>
        <StatIcon type={icon} />
      </div>
      <p className={`font-[family-name:var(--font-instrument-sans)] text-3xl font-bold transition-colors duration-700 ${started ? "text-[#0b6b45]" : "text-[#244233]/30"}`}>
        <SlotDigits value={count} />
        <span>{suffix}</span>
      </p>
      <p className="text-[13px] font-medium text-[#466254]">{label}</p>
    </div>
  );
}

interface TreatmentSectionProps {
  whyUs?: HomeWhyUs;
  revealOpacity?: MotionValue<number>;
  revealY?: MotionValue<number>;
}

const sectionVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export function TreatmentSection({
  whyUs = HOME_FALLBACK.whyUs,
  revealOpacity,
  revealY,
}: TreatmentSectionProps) {
  const content = (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {/* Ana iki sütun */}
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Sol — fotoğraf */}
        <motion.div
          variants={itemVariants}
          className="relative min-h-[22rem] overflow-hidden rounded-[1.75rem] bg-[#eef6f1] sm:min-h-[28rem] lg:min-h-[36rem]"
        >
          <div
            className="absolute right-5 top-5 z-10 rounded-2xl border border-[#0b6b45]/20 bg-white p-3"
            aria-hidden="true"
          >
            <Image
              src="/kaduseus-green.png"
              alt=""
              width={96}
              height={96}
              sizes="48px"
              className="h-12 w-12 object-contain opacity-80"
            />
          </div>
          <Image
            src={homeImageUrl(whyUs.image)}
            alt=""
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover object-[center_18%]"
          />
        </motion.div>

        {/* Sağ — içerik */}
        <motion.div variants={itemVariants} className="flex flex-col justify-center">
          <RevealText label={whyUs.label} text={whyUs.text} />

          <motion.div
            variants={itemVariants}
            className="mx-auto mt-8 grid w-full max-w-md grid-cols-2 gap-4"
          >
            {whyUs.stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </motion.div>
        </motion.div>
      </div>

    </motion.div>
  );

  if (revealOpacity && revealY) {
    return (
      <section
        id="eyup-baykara"
        aria-labelledby="doctor-heading"
        className="relative z-10 px-6 pb-12 pt-24 md:px-10 lg:px-16"
      >
        <motion.div
          className="mx-auto max-w-7xl"
          style={{ opacity: revealOpacity, y: revealY }}
        >
          <h2 id="doctor-heading" className="sr-only">
            Op. Dr. Eyüp Baykara
          </h2>
          {content}
        </motion.div>
      </section>
    );
  }

  return (
    <section
      id="eyup-baykara"
      aria-labelledby="doctor-heading-static"
      className="relative z-10 px-6 pb-12 pt-24 md:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-7xl">
        <h2 id="doctor-heading-static" className="sr-only">
          Op. Dr. Eyüp Baykara
        </h2>
        {content}
      </div>
    </section>
  );
}
