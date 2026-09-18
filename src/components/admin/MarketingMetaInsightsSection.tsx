import {
  loadMetaCrmBreakdown,
  loadMetaMarketingInsights,
} from "@/lib/marketing/admin-stats";
import type { MarketingPeriod } from "@/lib/marketing/date-range";
import { MarketingMetaInsightsPanel } from "@/components/admin/MarketingMetaInsightsPanel";

export async function MarketingMetaInsightsSection({
  startDate,
  endDate,
  siteFilter,
  period,
}: {
  startDate: string;
  endDate: string;
  siteFilter: string | null;
  period: MarketingPeriod;
}) {
  const [insights, crm] = await Promise.all([
    loadMetaMarketingInsights(startDate, endDate, siteFilter),
    loadMetaCrmBreakdown(startDate, endDate, siteFilter),
  ]);

  return (
    <MarketingMetaInsightsPanel
      insights={insights}
      crm={crm}
      period={period}
      startDate={startDate}
      endDate={endDate}
      siteFilter={siteFilter}
    />
  );
}

export function MarketingMetaInsightsFallback() {
  return (
    <section className="rounded-2xl border border-[#123524]/08 bg-white p-5">
      <div className="h-6 w-40 animate-pulse rounded-lg bg-[#eef2f0]" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl bg-[#f7f9f8]"
          />
        ))}
      </div>
    </section>
  );
}
