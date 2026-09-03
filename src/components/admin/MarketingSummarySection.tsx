import { loadMarketingSummary } from "@/lib/marketing/admin-stats";
import {
  MarketingDailyChart,
  MarketingPlatformBars,
} from "@/components/admin/MarketingCharts";
import { formatPct, formatTry } from "@/lib/marketing/format";
import { formatMarketingDateRangeTr } from "@/lib/marketing/date-range";

export async function MarketingSummarySection({
  startDate,
  endDate,
  siteFilter,
  channel,
}: {
  startDate: string;
  endDate: string;
  siteFilter: string | null;
  channel: "google" | "meta";
}) {
  const summary = await loadMarketingSummary(startDate, endDate, siteFilter);
  if (!summary) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Özet alınamadı. Migration uygulandı mı? (
        <code>20260903220000_marketing_summary_fast.sql</code>)
      </p>
    );
  }

  const channelSpend =
    channel === "meta"
      ? summary.platforms.meta.spend
      : summary.platforms.google_ads.spend;
  const channelCrmLeads =
    channel === "meta"
      ? summary.platforms.meta.leads
      : summary.platforms.google_ads.leads;
  const channelCpl =
    channel === "meta"
      ? summary.platforms.meta.cpl
      : summary.platforms.google_ads.cpl;

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={`Toplam harcama (${channel === "meta" ? "Meta" : "Google"})`}
          value={formatTry(channelSpend)}
          hint={formatMarketingDateRangeTr(startDate, endDate)}
        />
        <SummaryCard
          label={`CRM lead (${channel === "meta" ? "Meta" : "Google"})`}
          value={String(channelCrmLeads)}
          hint={
            channel === "meta"
              ? "fbclid / Click-to-WhatsApp / Meta UTM"
              : "gclid / Google UTM ile eşleşen"
          }
        />
        <SummaryCard
          label="CPL (CRM)"
          value={formatTry(channelCpl)}
          hint="Harcama ÷ CRM lead"
        />
        <SummaryCard
          label="Lead → Randevu"
          value={formatPct(summary.appointment_rate)}
          hint={`${summary.appointment_leads} randevulu/bitti (tüm CRM)`}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#123524]/08 bg-white p-5 sm:p-6">
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            Günlük harcama vs lead
          </h2>
          <p className="mt-1 text-sm text-[#466254]">
            {endDate > startDate &&
            Date.parse(`${endDate}T12:00:00Z`) -
              Date.parse(`${startDate}T12:00:00Z`) >
              90 * 86_400_000
              ? "90+ gün: haftalık özet"
              : "Seçili tarih aralığı (site filtresi)"}
          </p>
          <div className="mt-4">
            <MarketingDailyChart daily={summary.daily} />
          </div>
        </section>

        <section className="rounded-2xl border border-[#123524]/08 bg-white p-5 sm:p-6">
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            Platform özeti
          </h2>
          <p className="mt-1 text-sm text-[#466254]">
            Google Ads vs Meta (karşılaştırma)
          </p>
          <div className="mt-5">
            <MarketingPlatformBars summary={summary} />
          </div>
        </section>
      </div>
    </>
  );
}

export function MarketingSummaryFallback() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-2xl border border-[#123524]/08 bg-white"
        />
      ))}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-2xl border border-[#123524]/08 bg-white px-4 py-4">
      <p className="text-sm font-semibold text-[#466254]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-instrument-sans)] text-3xl font-semibold tabular-nums text-[#123524]">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-[#466254]/80">{hint}</p>
    </article>
  );
}
