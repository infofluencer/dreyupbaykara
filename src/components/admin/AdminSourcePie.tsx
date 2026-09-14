"use client";

import Link from "next/link";
import { useState } from "react";

export type SourcePieSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
  href: string;
};

export function AdminSourcePie({
  title,
  hint,
  totalLabel,
  slices,
  href,
}: {
  title: string;
  hint?: string;
  totalLabel: string;
  slices: SourcePieSlice[];
  href?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const size = 196;
  const stroke = 36;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = slices.map((slice) => {
    const length = total > 0 ? (slice.value / total) * circumference : 0;
    const start = offset;
    offset += length;
    return { ...slice, length, start };
  });

  const hovered = slices.find((slice) => slice.id === active);

  const centerPrimaryText = hovered ? String(hovered.value) : String(total);
  const centerSecondaryText = hovered ? hovered.label : totalLabel;

  return (
    <section className="min-w-0 rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            {title}
          </h2>
          {hint ? (
            <p className="mt-1 text-sm text-pretty text-[#466254]">{hint}</p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="-mr-2 -mt-2 inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-medium text-[#0b6b45] hover:underline"
          >
            Tümü →
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 sm:mt-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative shrink-0">
          {/* Genişlik CSS ile: dar ekranda halka küçülür, viewBox ölçeği korur. */}
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="h-auto w-40 sm:w-[196px]"
            role="img"
            aria-label={`${title}: ${total} ${totalLabel}`}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#eef2f0"
              strokeWidth={stroke}
            />
            {total > 0
              ? arcs
                  .filter((arc) => arc.length > 0)
                  .map((arc) => (
                    <a key={arc.id} href={arc.href} aria-label={arc.label}>
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth={active === arc.id ? stroke + 6 : stroke}
                        strokeDasharray={`${arc.length} ${circumference}`}
                        strokeDashoffset={-arc.start}
                        strokeLinecap="butt"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        className="cursor-pointer transition-[stroke-width] duration-200"
                        onMouseEnter={() => setActive(arc.id)}
                        onMouseLeave={() => setActive(null)}
                      />
                    </a>
                  ))
              : null}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tabular-nums text-[#123524] sm:text-3xl">
              {centerPrimaryText}
            </p>
            <p className="mt-0.5 max-w-[6rem] text-[11px] leading-4 text-[#466254] sm:max-w-[7.5rem]">
              {centerSecondaryText}
            </p>
          </div>
        </div>

        <ul className="w-full min-w-0 flex-1 space-y-0.5 sm:space-y-1.5">
          {slices.map((slice) => {
            const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
            const isActive = active === slice.id;
            return (
              <li key={slice.id}>
                <Link
                  href={slice.href}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-2 transition active:bg-[#eef2f0] ${
                    isActive ? "bg-[#f4f6f5]" : "hover:bg-[#f4f6f5]"
                  }`}
                  onMouseEnter={() => setActive(slice.id)}
                  onMouseLeave={() => setActive(null)}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-[#123524]">
                    {slice.label}
                  </span>
                  <span className="tabular-nums text-sm font-semibold text-[#123524]">
                    {slice.value}
                  </span>
                  <span className="w-10 text-right text-xs tabular-nums text-[#466254]">
                    {pct}%
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
