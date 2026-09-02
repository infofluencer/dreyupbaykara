"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { MarketingLoadingOverlay } from "@/components/admin/MarketingLoadingOverlay";
import {
  MARKETING_PERIOD_OPTIONS,
  formatMarketingDateRangeTr,
  marketingDateRangeForPeriod,
  type MarketingPeriod,
} from "@/lib/marketing/date-range";
import { buildMarketingHref } from "@/lib/marketing/urls";

type MarketingFilterBarProps = {
  period: MarketingPeriod;
  startDate: string;
  endDate: string;
  siteFilter: string | null;
  platform: string;
  event: string;
  search: string;
  siteOptions: string[];
};

export function MarketingFilterBar({
  period,
  startDate,
  endDate,
  siteFilter,
  platform,
  event,
  search,
  siteOptions,
}: MarketingFilterBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftPeriod, setDraftPeriod] = useState<MarketingPeriod>(period);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [draftSite, setDraftSite] = useState(siteFilter ?? "");

  useEffect(() => {
    setDraftPeriod(period);
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setDraftSite(siteFilter ?? "");
  }, [period, startDate, endDate, siteFilter]);

  const previewRange = useMemo(() => {
    if (draftPeriod === "custom") {
      return { startDate: draftStart, endDate: draftEnd };
    }
    return marketingDateRangeForPeriod(draftPeriod);
  }, [draftPeriod, draftStart, draftEnd]);

  function applyFilters() {
    const href =
      draftPeriod === "custom"
        ? buildMarketingHref({
            period: "custom",
            start: draftStart,
            end: draftEnd,
            site: draftSite || undefined,
            platform,
            event,
            q: search,
          })
        : buildMarketingHref({
            period: draftPeriod,
            site: draftSite || undefined,
            platform,
            event,
            q: search,
          });

    startTransition(() => {
      router.push(href);
    });
  }

  const isCustom = draftPeriod === "custom";

  return (
    <>
      <MarketingLoadingOverlay
        open={isPending}
        message="Filtreler uygulanıyor…"
      />

      <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex flex-col gap-1 text-sm lg:min-w-[12rem]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
              Tarih aralığı
            </span>
            <select
              value={draftPeriod}
              onChange={(event) =>
                setDraftPeriod(event.target.value as MarketingPeriod)
              }
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
                  value={draftStart}
                  onChange={(event) => setDraftStart(event.target.value)}
                  className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
                  Bitiş
                </span>
                <input
                  type="date"
                  value={draftEnd}
                  onChange={(event) => setDraftEnd(event.target.value)}
                  className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3"
                />
              </label>
            </>
          ) : (
            <p className="pb-2 text-sm text-[#466254] lg:pb-0">
              {formatMarketingDateRangeTr(
                previewRange.startDate,
                previewRange.endDate,
              )}
            </p>
          )}

          <label className="flex flex-col gap-1 text-sm lg:min-w-[14rem]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
              Site
            </span>
            <select
              value={draftSite}
              onChange={(event) => setDraftSite(event.target.value)}
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

          <button
            type="button"
            onClick={applyFilters}
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#123524] px-6 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Yükleniyor…" : "Filtrele"}
          </button>

          {siteFilter ? (
            <Link
              href={buildMarketingHref({
                period,
                start: period === "custom" ? startDate : undefined,
                end: period === "custom" ? endDate : undefined,
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
    </>
  );
}
