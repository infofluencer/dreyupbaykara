import { loadMarketingSummaryResult } from "@/lib/marketing/admin-stats";
import {
  MarketingDailyChart,
  MarketingPlatformBars,
} from "@/components/admin/MarketingCharts";
import { KpiCard } from "@/components/admin/KpiCard";
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
  const { summary, error } = await loadMarketingSummaryResult(
    startDate,
    endDate,
    siteFilter,
  );
  if (!summary) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Özet alınamadı
        {error ? (
          <>
            : <span className="font-mono text-xs">{error}</span>
          </>
        ) : null}
        . Migration uygulandı mı? (
        <code>20260917140000_meta_insights_reach_platform.sql</code>)
      </p>
    );
  }

  const isMeta = channel === "meta";
  const channelSpend = isMeta
    ? summary.platforms.meta.spend
    : summary.platforms.google_ads.spend;
  const channelCrmLeads = isMeta
    ? summary.platforms.meta.leads
    : summary.platforms.google_ads.leads;
  const channelCpl = isMeta
    ? summary.platforms.meta.cpl
    : summary.platforms.google_ads.cpl;

  const appointmentLeads = isMeta
    ? summary.meta_appointment_leads
    : summary.appointment_leads;
  const appointmentRate = isMeta
    ? channelCrmLeads > 0 && summary.meta_appointment_leads != null
      ? summary.meta_appointment_leads / channelCrmLeads
      : null
    : summary.appointment_rate;

  const hasMetaDaily = summary.daily.some(
    (row) => row.meta_spend != null || row.meta_leads != null,
  );
  const daily = isMeta
    ? hasMetaDaily
      ? summary.daily.map((row) => ({
          date: row.date,
          spend: row.meta_spend ?? 0,
          leads: row.meta_leads ?? 0,
        }))
      : []
    : summary.daily;

  return (
    <>
      {isMeta ? null : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Toplam harcama (Google)"
            value={formatTry(channelSpend)}
            hint={formatMarketingDateRangeTr(startDate, endDate)}
            help={{
              meaning: "Filtrelenen Google kampanyalarının toplam reklam harcaması.",
              formula: "Σ ad_daily_stats.spend (google_ads)",
            }}
          />
          <KpiCard
            label="CRM lead (Google)"
            value={String(channelCrmLeads)}
            hint="gclid / Google UTM ile eşleşen"
            help={{
              meaning:
                "CRM kaydında gclid, gbraid, wbraid veya Google UTM olan lead sayısı. Ads dönüşüm tag’i değildir.",
              formula: "leads where gclid/gbraid/wbraid veya utm_source google",
            }}
          />
          <KpiCard
            label="CPL (CRM)"
            value={formatTry(channelCpl)}
            hint="Harcama ÷ CRM lead"
            help={{
              meaning: "Bir CRM lead’in Google harcamasına maliyeti.",
              formula: "Google harcama ÷ Google CRM lead",
            }}
          />
          <KpiCard
            label="Lead → Ameliyat"
            value={formatPct(appointmentRate)}
            hint={
              appointmentLeads != null
                ? `${appointmentLeads} ameliyat / bitti (tüm CRM)`
                : "Ameliyat / bitti oranı"
            }
            help={{
              meaning:
                "CRM lead’lerden ameliyat olacak / edildi / bitti oranı. Google kartında tüm CRM (kanal karışık) kullanılır.",
              formula:
                "(ameliyat_olacak + ameliyat_edildi + bitti) ÷ tüm CRM lead",
            }}
          />
        </section>
      )}

      {isMeta ? (
        daily.length ? (
          <section className="rounded-2xl border border-[#123524]/08 bg-white p-5 sm:p-6">
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
              Günlük harcama vs CRM lead
            </h2>
            <p className="mt-1 text-sm text-[#466254]">
              Yalnızca Meta harcama ve Meta&apos;ya atfedilen CRM kayıtları
            </p>
            <div className="mt-4">
              <MarketingDailyChart daily={daily} seriesLabel="CRM lead" />
            </div>
          </section>
        ) : null
      ) : (
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
              <MarketingDailyChart daily={daily} />
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
      )}
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
