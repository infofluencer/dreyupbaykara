"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { MarketingLoadingOverlay } from "@/components/admin/MarketingLoadingOverlay";
import {
  DEFAULT_MARKETING_PERIOD,
  MARKETING_PERIOD_OPTIONS,
  type MarketingPeriod,
} from "@/lib/marketing/date-range";

const HOME_PERIODS = MARKETING_PERIOD_OPTIONS.filter(
  (option) => option.value !== "custom" && option.value !== "24",
);

export function AdminHomeSiteFilter({
  siteOptions,
  currentSite,
  currentPeriod = DEFAULT_MARKETING_PERIOD,
}: {
  siteOptions: string[];
  currentSite: string | null;
  currentPeriod?: MarketingPeriod;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function push(next: URLSearchParams) {
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/admin?${qs}` : "/admin");
    });
  }

  function onSiteChange(site: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (site) next.set("site", site);
    else next.delete("site");
    push(next);
  }

  function onPeriodChange(period: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!period || period === DEFAULT_MARKETING_PERIOD) {
      next.delete("period");
    } else {
      next.set("period", period);
    }
    next.delete("start");
    next.delete("end");
    push(next);
  }

  return (
    <>
      <MarketingLoadingOverlay
        open={isPending}
        message="Özet yükleniyor…"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
        <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm font-medium text-[#466254]">Dönem</span>
          <select
            value={
              currentPeriod === "custom"
                ? DEFAULT_MARKETING_PERIOD
                : currentPeriod
            }
            onChange={(event) => onPeriodChange(event.target.value)}
            disabled={isPending}
            className="min-h-11 w-full max-w-full truncate rounded-xl border border-[#123524]/12 bg-white px-3 text-sm text-[#123524] outline-none focus:border-[#0b6b45]/40 disabled:opacity-60 sm:w-auto"
          >
            {HOME_PERIODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm font-medium text-[#466254]">Site</span>
          <select
            value={currentSite ?? ""}
            onChange={(event) => onSiteChange(event.target.value)}
            disabled={isPending}
            className="min-h-11 w-full max-w-full truncate rounded-xl border border-[#123524]/12 bg-white px-3 text-sm text-[#123524] outline-none focus:border-[#0b6b45]/40 disabled:opacity-60 sm:w-auto"
          >
            <option value="">Tüm siteler</option>
            {siteOptions.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
