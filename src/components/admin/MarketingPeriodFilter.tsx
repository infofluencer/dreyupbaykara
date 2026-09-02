"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

  function baseHref(next: {
    period?: string;
    start?: string;
    end?: string;
    site?: string;
  }) {
    return buildMarketingHref({
      period: next.period ?? period,
      start: next.start,
      end: next.end,
      site: next.site ?? siteFilter ?? undefined,
      platform,
      event,
      q: search,
    });
  }

  function onPeriodChange(nextPeriod: MarketingPeriod) {
    if (nextPeriod === "custom") {
      router.push(
        baseHref({
          period: "custom",
          start: startDate,
          end: endDate,
        }),
      );
      return;
    }

    router.push(baseHref({ period: nextPeriod }));
  }

  return (
    <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
      <form
        action="/admin/marketing"
        className="flex flex-col gap-3 lg:flex-row lg:items-end"
      >
        {platform !== "all" ? (
          <input type="hidden" name="platform" value={platform} />
        ) : null}
        {event !== "all" ? (
          <input type="hidden" name="event" value={event} />
        ) : null}
        {search ? <input type="hidden" name="q" value={search} /> : null}
        {!isCustom ? (
          <input type="hidden" name="period" value={period} />
        ) : (
          <input type="hidden" name="period" value="custom" />
        )}

        <label className="flex flex-col gap-1 text-sm lg:min-w-[12rem]">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
            Tarih aralığı
          </span>
          <select
            name="period"
            value={period}
            onChange={(event) =>
              onPeriodChange(event.target.value as MarketingPeriod)
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
                name="start"
                defaultValue={startDate}
                required
                className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
                Bitiş
              </span>
              <input
                type="date"
                name="end"
                defaultValue={endDate}
                required
                className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3"
              />
            </label>
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
            name="site"
            value={siteFilter ?? ""}
            onChange={
              isCustom
                ? undefined
                : (event) => {
                    const site = event.target.value;
                    router.push(
                      baseHref({
                        site: site || undefined,
                      }),
                    );
                  }
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

        {isCustom ? (
          <button className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#123524] px-5 text-sm font-semibold text-white">
            Uygula
          </button>
        ) : null}

        {siteFilter ? (
          <Link
            href={baseHref({ site: "" })}
            className="inline-flex min-h-10 items-center justify-center text-sm font-semibold text-[#466254]"
          >
            Site filtresini kaldır
          </Link>
        ) : null}
      </form>
    </section>
  );
}
