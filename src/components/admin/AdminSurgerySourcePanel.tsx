"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PLATFORM_COLOR,
  SURGERY_PLATFORM_LABEL,
  type AdPlatform,
} from "@/lib/crm/source-kind";
import type {
  SurgeryAttrOrigin,
  SurgerySourcePatient,
} from "@/lib/marketing/surgery-sources";

const ORIGIN_LABEL: Record<SurgeryAttrOrigin, string> = {
  lead: "lead",
  lead_sources: "Ref / click log",
  sibling: "miras (kardeş)",
  none: "sinyal yok",
};

const PLATFORM_ORDER: AdPlatform[] = [
  "google_ads",
  "meta",
  "organic",
  "other",
];

function shortDateTr(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function attrHint(row: SurgerySourcePatient) {
  if (row.attrOrigin === "none") return ORIGIN_LABEL.none;
  if (row.attrOrigin === "sibling") {
    return `${ORIGIN_LABEL.sibling} · ${row.attrSignal}`;
  }
  if (row.attrOrigin === "lead_sources") {
    return `${ORIGIN_LABEL.lead_sources} · ${row.attrSignal}`;
  }
  return row.attrSignal;
}

export function AdminSurgerySourcePanel({
  title,
  hint,
  total,
  platforms,
  patients,
  href,
}: {
  title: string;
  hint?: string;
  total: number;
  platforms: Record<AdPlatform, number>;
  patients: SurgerySourcePatient[];
  href?: string;
}) {
  const [active, setActive] = useState<AdPlatform | "all">("all");
  const [hovered, setHovered] = useState<AdPlatform | null>(null);

  const slices = useMemo(
    () =>
      PLATFORM_ORDER.map((id) => ({
        id,
        label: SURGERY_PLATFORM_LABEL[id],
        value: platforms[id] ?? 0,
        color: PLATFORM_COLOR[id],
      })),
    [platforms],
  );

  const filtered = useMemo(() => {
    if (active === "all") return patients;
    return patients.filter((p) => p.platform === active);
  }, [patients, active]);

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

  const hoverSlice = slices.find((s) => s.id === hovered);
  const centerPrimary = hoverSlice ? String(hoverSlice.value) : String(total);
  const centerSecondary = hoverSlice ? hoverSlice.label : "ameliyat";

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
            Reklam →
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
          <div className="relative shrink-0 self-center">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="h-auto w-40 sm:w-[180px]"
              role="img"
              aria-label={`${title}: ${total} ameliyat`}
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
                      <circle
                        key={arc.id}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth={
                          hovered === arc.id || active === arc.id
                            ? stroke + 6
                            : stroke
                        }
                        strokeDasharray={`${arc.length} ${circumference}`}
                        strokeDashoffset={-arc.start}
                        strokeLinecap="butt"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        className="cursor-pointer transition-[stroke-width] duration-200"
                        onMouseEnter={() => setHovered(arc.id)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() =>
                          setActive((prev) =>
                            prev === arc.id ? "all" : arc.id,
                          )
                        }
                      />
                    ))
                : null}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tabular-nums text-[#123524]">
                {centerPrimary}
              </p>
              <p className="mt-0.5 max-w-[6rem] text-[11px] leading-4 text-[#466254]">
                {centerSecondary}
              </p>
            </div>
          </div>

          <ul className="w-full min-w-0 flex-1 space-y-0.5">
            <li>
              <button
                type="button"
                onClick={() => setActive("all")}
                className={`flex min-h-10 w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm transition ${
                  active === "all"
                    ? "bg-[#f4f6f5] font-semibold text-[#123524]"
                    : "text-[#466254] hover:bg-[#f4f6f5]"
                }`}
              >
                Tümü
                <span className="ml-auto tabular-nums font-semibold text-[#123524]">
                  {total}
                </span>
              </button>
            </li>
            {slices.map((slice) => {
              const pct =
                total > 0 ? Math.round((slice.value / total) * 100) : 0;
              const isActive = active === slice.id;
              return (
                <li key={slice.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setActive((prev) =>
                        prev === slice.id ? "all" : slice.id,
                      )
                    }
                    onMouseEnter={() => setHovered(slice.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition ${
                      isActive ? "bg-[#f4f6f5]" : "hover:bg-[#f4f6f5]"
                    }`}
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
                    <span className="w-9 text-right text-xs tabular-nums text-[#466254]">
                      {pct}%
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0 rounded-xl border border-[#123524]/08 bg-[#f7f9f8]">
          <div className="flex items-center justify-between gap-2 border-b border-[#123524]/08 px-3 py-2.5 sm:px-4">
            <p className="text-sm font-semibold text-[#123524]">
              Hastalar
              {active !== "all" ? (
                <span className="ml-1.5 font-normal text-[#466254]">
                  · {SURGERY_PLATFORM_LABEL[active]}
                </span>
              ) : null}
            </p>
            <p className="text-xs tabular-nums text-[#466254]">
              {filtered.length} kişi
            </p>
          </div>

          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#466254]">
              Bu dönemde ameliyat kaydı yok.
            </p>
          ) : (
            <ul className="max-h-[22rem] divide-y divide-[#123524]/06 overflow-y-auto overscroll-contain">
              {filtered.map((row) => {
                const hrefPatient = row.contactId
                  ? `/admin/patients/${row.contactId}`
                  : `/admin/messages?lead=${row.leadId}`;
                const hintText = attrHint(row);
                return (
                  <li key={row.leadId}>
                    <Link
                      href={hrefPatient}
                      className="flex min-h-12 items-center gap-3 px-3 py-2.5 transition hover:bg-white active:bg-white sm:px-4"
                      title={hintText}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: PLATFORM_COLOR[row.platform],
                        }}
                        title={SURGERY_PLATFORM_LABEL[row.platform]}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-[#123524]">
                          {row.name || row.phone || "İsimsiz"}
                        </span>
                        <span className="block truncate text-xs text-[#466254]">
                          {row.name && row.phone ? `${row.phone} · ` : null}
                          {hintText}
                        </span>
                      </span>
                      <span className="hidden shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#123524] sm:inline-flex">
                        {SURGERY_PLATFORM_LABEL[row.platform]}
                      </span>
                      {row.surgeryAt ? (
                        <span className="shrink-0 text-xs tabular-nums text-[#466254]">
                          {shortDateTr(row.surgeryAt)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
