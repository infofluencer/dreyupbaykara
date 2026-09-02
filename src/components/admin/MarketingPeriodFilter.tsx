"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MARKETING_PERIOD_OPTIONS,
  type MarketingPeriod,
} from "@/lib/marketing/date-range";
import { buildMarketingHref } from "@/lib/marketing/urls";

type MarketingPeriodFilterProps = {
  period: MarketingPeriod;
  startDate: string;
  endDate: string;
  siteFilter: string | null;
  platform: string;
  event: string;
  search: string;
  siteOptions: string[];
};

export function MarketingPeriodFilter({
  period,
  startDate,
  endDate,
  siteFilter,
  platform,
  event,
  search,
  siteOptions,
}: MarketingPeriodFilterProps) {
  const router = useRouter();
  const isCustom = period === "custom";
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  useEffect(() => {
    setCustomStart(startDate);
    setCustomEnd(endDate);
  }, [startDate, endDate]);

  function navigate(next: {
    period?: MarketingPeriod;
    start?: string;
    end?: string;
    site?: string;
  }) {
    router.push(
      buildMarketingHref({
        period: next.period ?? period,
        start: next.start,
        end: next.end,
        site:
          next.site !== undefined
            ? next.site || undefined
            : siteFilter ?? undefined,
        platform,
        event,
        q: search,
      }),
    );
  }

  return (
    <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="flex flex-col gap-1 text-sm lg:min-w-[12rem]">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
            Tarih aralığı
          </span>
          <select
            value={period}
            onChange={(event) => {
              const nextPeriod = event.target.value as MarketingPeriod;
              if (nextPeriod === "custom") {
                navigate({
                  period: "custom",
                  start: customStart,
                  end: customEnd,
                });
                return;
              }
              navigate({ period: nextPeriod });
            }}
            className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3"
          >
            {MARKETING_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {isCustom ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
                Başlangıç
              </span>
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
                Bitiş
              </span>
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3"
              />
            </label>
            <button
              type="button"
              onClick={() =>
                navigate({
                  period: "custom",
                  start: customStart,
                  end: customEnd,
                })
              }
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#123524] px-5 text-sm font-semibold text-white"
            >
              Uygula
            </button>
          </>
        ) : (
          <p className="pb-2 text-sm text-[#466254] lg:pb-0">
            <span className="font-medium text-[#123524] tabular-nums">
              {startDate}
            </span>
            <span className="mx-1.5">–</span>
            <span className="font-medium text-[#123524] tabular-nums">
              {endDate}
            </span>
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm lg:min-w-[14rem]">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
            Site
          </span>
          <select
            value={siteFilter ?? ""}
            onChange={(event) =>
              navigate({
                site: event.target.value,
                ...(isCustom
                  ? { period: "custom", start: customStart, end: customEnd }
                  : {}),
              })
            }
            className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3"
          >
            <option value="">Tüm siteler</option>
            {siteOptions.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
        </label>

        {siteFilter ? (
          <Link
            href={buildMarketingHref({
              period,
              start: isCustom ? customStart : undefined,
              end: isCustom ? customEnd : undefined,
              platform,
              event,
              q: search,
            })}
            className="inline-flex min-h-10 items-center justify-center text-sm font-semibold text-[#466254]"
          >
            Site filtresini kaldır
          </Link>
        ) : null}
      </div>
    </section>
  );
}
