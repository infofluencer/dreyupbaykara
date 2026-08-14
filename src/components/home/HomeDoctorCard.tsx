"use client";

import { motion, type MotionValue } from "framer-motion";
import Image from "next/image";
import { VectorPattern } from "@/components/VectorPattern";
import {
  HOME_FALLBACK,
  homeImageUrl,
  type HomeHero,
} from "@/lib/cms/home";

/**
 * Mobil ve masaüstü kartları aynı anda DOM'da; `sizes` ikisinde de aynı olmalı,
 * aksi halde tarayıcı gizli olan varyant için ikinci bir dosya indiriyor.
 */
const DOCTOR_IMAGE_SIZES = "(min-width: 1024px) 288px, 45vw";

interface HomeDoctorCardProps {
  hero?: HomeHero;
  style?: {
    opacity?: MotionValue<number>;
    y?: MotionValue<number>;
  };
  /** Compact stack card for mobile hero only */
  mobile?: boolean;
}

function DoctorCardInner({
  mobile = false,
  hero = HOME_FALLBACK.hero,
}: {
  mobile?: boolean;
  hero?: HomeHero;
}) {
  if (mobile) {
    return (
      <div className="pointer-events-auto relative flex h-full min-h-0 overflow-hidden rounded-[1.35rem] bg-[#e8f3ef] shadow-[0_16px_40px_rgba(15,39,68,0.1)]">
        <VectorPattern
          tone="light"
          opacity={0.06}
          size={220}
          className="rounded-[inherit]"
        />
        <div className="relative z-10 flex w-[56%] flex-col justify-between p-3.5">
          <div>
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-[1.2rem] font-semibold leading-[1.15] tracking-tight text-[#1e3352]">
              {hero.doctorName1}
              <br />
              {hero.doctorName2}
            </h2>
            <p className="mt-2 text-[11px] leading-snug text-[#5b6b7c]">
              {hero.doctorBio}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <a
              href="https://www.google.com/maps/search/?api=1&query=Op.+Dr.+Ey%C3%BCp+Baykara"
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 rounded-lg bg-white px-2.5 py-2 shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-[family-name:var(--font-instrument-sans)] text-base font-bold text-[#1e3352]">
                  {hero.rating}
                </span>
                <div className="flex gap-0.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg
                      key={i}
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="#f59e0b"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="mt-0.5 text-[10px] font-semibold text-[#5b6b7c]">
                Google · {hero.reviewCount}
              </p>
            </a>
            <div className="rounded-lg bg-white px-2.5 py-2 shadow-sm">
              <p className="font-[family-name:var(--font-instrument-sans)] text-base font-bold text-[#1e3352]">
                {hero.doctorYears}
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-[#5b6b7c]">
                Yıl cerrahi
                <br />
                deneyim
              </p>
            </div>
            <div className="rounded-lg bg-white px-2.5 py-2 shadow-sm">
              <p className="font-[family-name:var(--font-instrument-sans)] text-base font-bold text-[#1e3352]">
                ✓
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-[#5b6b7c]">
                {hero.doctorPerk}
              </p>
            </div>
          </div>
        </div>

        <div className="absolute inset-y-0 right-0 w-[44%]">
          <Image
            src={homeImageUrl(hero.doctorImage)}
            alt={`${hero.doctorName1} ${hero.doctorName2}`}
            className="object-cover object-[center_18%]"
            fill
            sizes={DOCTOR_IMAGE_SIZES}
            preload
          />
          <div
            className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#e8f3ef] to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto relative flex h-[min(72dvh,34rem)] w-full max-w-[30rem] overflow-hidden rounded-[2rem] bg-[#e8f3ef] shadow-[0_24px_60px_rgba(15,39,68,0.1)]">
      <VectorPattern
        tone="light"
        opacity={0.06}
        size={280}
        className="rounded-[inherit]"
      />
      <div className="relative z-10 flex w-[52%] flex-col justify-between p-5 lg:p-6">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-[1.35rem] font-semibold leading-[1.15] tracking-tight text-[#1e3352] lg:text-[1.55rem]">
            {hero.doctorName1}
            <br />
            {hero.doctorName2}
          </h2>
          <p className="mt-2.5 max-w-[14rem] text-xs leading-relaxed text-[#5b6b7c] lg:text-[13px]">
            {hero.doctorBio}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href="https://www.google.com/maps/search/?api=1&query=Op.+Dr.+Ey%C3%BCp+Baykara"
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 rounded-xl bg-white px-3 py-2.5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="shrink-0"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-[family-name:var(--font-instrument-sans)] text-lg font-bold tracking-tight text-[#1e3352]">
                {hero.rating}
              </span>
              <div className="flex gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="#f59e0b"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#5b6b7c]">
              Google · {hero.reviewCount}
            </p>
          </a>
          <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm">
            <p className="font-[family-name:var(--font-instrument-sans)] text-xl font-bold text-[#1e3352]">
              {hero.doctorYears}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-[#5b6b7c]">
              Yıl cerrahi
              <br />
              deneyim
            </p>
          </div>
          <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm">
            <p className="font-[family-name:var(--font-instrument-sans)] text-xl font-bold text-[#1e3352]">
              ✓
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-[#5b6b7c]">
              {hero.doctorPerk}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute inset-y-0 right-0 w-[56%]">
        <Image
          src={homeImageUrl(hero.doctorImage)}
          alt={`${hero.doctorName1} ${hero.doctorName2}`}
          className="object-cover object-[center_18%]"
          fill
          sizes={DOCTOR_IMAGE_SIZES}
          preload
        />
        <div
          className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#e8f3ef] to-transparent"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function HomeDoctorCard({
  hero = HOME_FALLBACK.hero,
  style,
  mobile = false,
}: HomeDoctorCardProps) {
  if (mobile) {
    return (
      <motion.aside
        className="pointer-events-none min-h-0 w-full flex-1"
        aria-label={`${hero.doctorName1} ${hero.doctorName2}`}
        initial={false}
      >
        <DoctorCardInner hero={hero} mobile />
      </motion.aside>
    );
  }

  return (
    <motion.aside
      style={style}
      className="pointer-events-none absolute inset-y-0 right-0 z-[12] hidden w-[min(46%,34rem)] items-center justify-end pr-3 lg:flex lg:pr-8 xl:pr-10"
      aria-label={`${hero.doctorName1} ${hero.doctorName2}`}
      initial={false}
    >
      <DoctorCardInner hero={hero} />
    </motion.aside>
  );
}
