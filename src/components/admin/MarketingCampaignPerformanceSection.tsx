import {
  loadCampaignPerformance,
  loadGoogleLeadsSummary,
  loadMarketingSummary,
} from "@/lib/marketing/admin-stats";
import { MarketingCampaignTable } from "@/components/admin/MarketingCampaignTable";
import { MarketingGoogleLeadsSection } from "@/components/admin/MarketingGoogleLeadsSection";

export async function MarketingCampaignPerformanceSection({
  startDate,
  endDate,
  siteFilter,
  adPlatform,
  channelLabel,
  showGoogleLeads,
}: {
  startDate: string;
  endDate: string;
  siteFilter: string | null;
  adPlatform: "google_ads" | "meta";
  channelLabel: string;
  showGoogleLeads: boolean;
}) {
  const [campaignPerformance, summary] = await Promise.all([
    loadCampaignPerformance(startDate, endDate, siteFilter, adPlatform),
    showGoogleLeads
      ? loadMarketingSummary(startDate, endDate, siteFilter)
      : Promise.resolve(null),
  ]);

  const channelCrmLeads = summary?.platforms.google_ads.leads ?? 0;

  const googleLeads = showGoogleLeads
    ? await loadGoogleLeadsSummary(
        startDate,
        endDate,
        siteFilter,
        campaignPerformance.attribution.googleConversionsTotal,
      )
    : null;

  const daySpan =
    Math.floor(
      (Date.parse(`${endDate}T12:00:00Z`) -
        Date.parse(`${startDate}T12:00:00Z`)) /
        86_400_000,
    ) + 1;

  return (
    <>
      <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
          Kampanya performansı — {channelLabel}
        </h2>
        <p className="mt-1 text-sm text-[#466254]">
          Yalnızca seçili kanalın kampanyaları.
          {daySpan > 93
            ? " 90+ günde kampanya CRM sütunu atlanır (hız için); özet kartındaki CRM lead geçerli."
            : null}
        </p>
        <MarketingCampaignTable performance={campaignPerformance} />
      </section>

      {googleLeads ? (
        <MarketingGoogleLeadsSection
          summary={googleLeads}
          crmLeads={channelCrmLeads}
        />
      ) : null}
    </>
  );
}

export function MarketingCampaignPerformanceFallback() {
  return (
    <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
      <div className="h-6 w-56 animate-pulse rounded-lg bg-[#eef2f0]" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-lg bg-[#f7f9f8]"
          />
        ))}
      </div>
    </section>
  );
}
