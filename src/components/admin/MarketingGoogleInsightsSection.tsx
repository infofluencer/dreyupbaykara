import { loadGoogleMarketingInsights } from "@/lib/marketing/admin-stats";
import type { MarketingPeriod } from "@/lib/marketing/date-range";
import { MarketingGoogleInsightsPanel } from "@/components/admin/MarketingGoogleInsightsPanel";

export async function MarketingGoogleInsightsSection({
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
  const insights = await loadGoogleMarketingInsights(
    startDate,
    endDate,
    siteFilter,
  );

  return (
    <MarketingGoogleInsightsPanel
      insights={insights}
      period={period}
      startDate={startDate}
      endDate={endDate}
      siteFilter={siteFilter}
    />
  );
}

export function MarketingGoogleInsightsFallback() {
  return (
    <section className="rounded-2xl border border-[#123524]/08 bg-white p-5">
      <div className="h-6 w-40 animate-pulse rounded-lg bg-[#eef2f0]" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl bg-[#f7f9f8]"
          />
        ))}
      </div>
    </section>
  );
}
