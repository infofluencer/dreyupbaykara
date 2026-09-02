import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, Link2, TrendingUp } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  loadAdAccountsSafe,
  loadCampaignPerformance,
  loadGoogleLeadsSummary,
  loadMarketingSummary,
  loadSiteOptions,
  loadUnmatchedCampaigns,
} from "@/lib/marketing/admin-stats";
import { MARKETING_CLICK_LOGS_SITE, isMarketingAdSite } from "@/lib/marketing/constants";
import {
  resolveMarketingDateRange,
  pickMarketingQueryParam,
  formatMarketingDateRangeTr,
} from "@/lib/marketing/date-range";
import {
  MarketingDailyChart,
  MarketingPlatformBars,
} from "@/components/admin/MarketingCharts";
import {
  MarketingGoogleInsightsFallback,
  MarketingGoogleInsightsSection,
} from "@/components/admin/MarketingGoogleInsightsSection";
import { MarketingLeadSourcesSection } from "@/components/admin/MarketingLeadSourcesSection";
import { MarketingFilterBar } from "@/components/admin/MarketingFilterBar";
import { MarketingCampaignTable } from "@/components/admin/MarketingCampaignTable";
import { MarketingGoogleLeadsSection } from "@/components/admin/MarketingGoogleLeadsSection";
import { MarketingWaBridgeSetup } from "@/components/admin/MarketingWaBridgeSetup";
import { formatPct, formatTry } from "@/lib/marketing/format";
import { buildMarketingHref } from "@/lib/marketing/urls";
import { UnmatchedCampaignRow } from "@/components/admin/UnmatchedCampaignRow";
import { MarketingSyncButton } from "@/components/admin/MarketingSyncButton";
import {
  type AdPlatform,
  type SourceEvent,
} from "@/lib/crm/source-kind";

const PLATFORMS = ["google_ads", "meta", "other", "organic"] as const;
const EVENTS = ["landing", "whatsapp", "form"] as const;

type PlatformFilter = "all" | AdPlatform;
type EventFilter = "all" | SourceEvent;

function parsePlatform(raw?: string): PlatformFilter {
  return PLATFORMS.includes(raw as AdPlatform) ? (raw as AdPlatform) : "all";
}

function parseEvent(raw?: string): EventFilter {
  return EVENTS.includes(raw as SourceEvent) ? (raw as SourceEvent) : "all";
}

export default async function AdminMarketingPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string | string[];
    start?: string | string[];
    end?: string | string[];
    site?: string | string[];
    platform?: string | string[];
    event?: string | string[];
    q?: string | string[];
  }>;
}) {
  const session = await requireAdminSession(["admin", "doctor", "assistant", "agency"]);
  const raw = await searchParams;
  const query = {
    period: pickMarketingQueryParam(raw.period),
    start: pickMarketingQueryParam(raw.start),
    end: pickMarketingQueryParam(raw.end),
    site: pickMarketingQueryParam(raw.site),
    platform: pickMarketingQueryParam(raw.platform),
    event: pickMarketingQueryParam(raw.event),
    q: pickMarketingQueryParam(raw.q),
  };
  const { startDate, endDate, period } = resolveMarketingDateRange(query);
  const siteFilter = query.site?.trim() || null;
  const platform = parsePlatform(query.platform);
  const event = parseEvent(query.event);
  const search = query.q?.trim() || "";

  const [summary, campaignPerformance, unmatched, siteOptions, accounts] =
    await Promise.all([
      loadMarketingSummary(startDate, endDate, siteFilter),
      loadCampaignPerformance(startDate, endDate, siteFilter),
      loadUnmatchedCampaigns(),
      loadSiteOptions(),
      loadAdAccountsSafe(),
    ]);

  const googleLeads = await loadGoogleLeadsSummary(
    startDate,
    endDate,
    siteFilter,
    campaignPerformance.attribution.googleConversionsTotal,
  );

  const inactiveAccounts = accounts.filter((a) => !a.is_active || !a.has_token);
  const hasAccounts = accounts.some((a) => a.is_active && a.has_token);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight">
            Reklam
          </h1>
          <p className="mt-2 text-sm text-[#466254]">
            Harcama, lead, CPL ve tıklama kayıtları — site bazlı filtre ile tüm
            siteleri tek yerden yönetin.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {session.role === "admin" && hasAccounts ? (
            <MarketingSyncButton />
          ) : null}
          <Link
            href="/admin/marketing/connect"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#123524]/12 bg-white px-4 text-sm font-semibold text-[#123524] hover:border-[#0b6b45]/30"
          >
            <Link2 className="h-4 w-4" />
            Hesap bağla
          </Link>
        </div>
      </div>

      {inactiveAccounts.length ? (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Reklam hesabı yeniden bağlanmalı</p>
            <p className="mt-1">
              {inactiveAccounts
                .map((a) =>
                  a.platform === "google_ads" ? "Google Ads" : "Meta",
                )
                .join(", ")}{" "}
              token süresi doldu veya devre dışı.
            </p>
            <Link
              href="/admin/marketing/connect"
              className="mt-2 inline-block font-semibold text-amber-900 underline"
            >
              Bağlantı sayfasına git →
            </Link>
          </div>
        </div>
      ) : null}

      {!hasAccounts ? (
        <div className="rounded-2xl border border-dashed border-[#123524]/15 bg-white px-5 py-8 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-[#466254]/50" />
          <p className="mt-3 text-sm font-semibold text-[#123524]">
            Henüz reklam hesabı bağlı değil
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#466254]">
            Google ve Meta hesaplarını bağladıktan sonra cron sync harcama
            verilerini çeker.
          </p>
          <Link
            href="/admin/marketing/connect"
            className="mt-4 inline-flex rounded-full bg-[#123524] px-4 py-2 text-sm font-semibold text-white"
          >
            Hesap bağla
          </Link>
        </div>
      ) : null}

      <MarketingFilterBar
        period={period}
        startDate={startDate}
        endDate={endDate}
        siteFilter={siteFilter}
        platform={platform}
        event={event}
        search={search}
        siteOptions={siteOptions}
      />

      {siteFilter === "endoskopikbelameliyati" &&
      summary &&
      summary.total_spend === 0 ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          <p className="font-semibold">Bu sitede aktif Google reklamı yok</p>
          <p className="mt-1">
            Ajans haritasına göre harcama{" "}
            <strong>endospineistanbul</strong> (647-432-9013) ve{" "}
            <strong>fitikameliyati</strong> (929-825-6533) hesaplarında. Site
            filtresini değiştirin veya{" "}
            <Link
              href={buildMarketingHref({
                period,
                site: "endospineistanbul",
                platform,
                event,
                q: search,
              })}
              className="font-semibold underline"
            >
              endospineistanbul
            </Link>
            {" / "}
            <Link
              href={buildMarketingHref({
                period,
                site: "fitikameliyati",
                platform,
                event,
                q: search,
              })}
              className="font-semibold underline"
            >
              fitikameliyati
            </Link>
            {" "}seçin.
          </p>
        </div>
      ) : null}

      {siteFilter &&
      isMarketingAdSite(siteFilter) &&
      summary &&
      summary.total_leads === 0 &&
      campaignPerformance.attribution.googleConversionsTotal > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">
            CRM lead bu reklam sitesine eşleşmedi — Google dönüşüm var
          </p>
          <p className="mt-1">
            Google reklamları{" "}
            <strong>
              {siteFilter === "endospineistanbul"
                ? "endospineistanbul.com"
                : "fitikameliyati.com"}
            </strong>
            &apos;a gidiyor; CRM lead&apos;leri ise{" "}
            <strong>endoskopikbelameliyati.com</strong> WhatsApp/form
            akışından geliyor. Veritabanında{" "}
            <code className="rounded bg-amber-100 px-1">gclid</code> /{" "}
            <code className="rounded bg-amber-100 px-1">utm_campaign</code>{" "}
            kaydı yoksa site filtresinde CRM lead 0 görünür — bu normaldir.
          </p>
          <p className="mt-2">
            Bu dönemde Google Ads dönüşüm:{" "}
            <strong>
              {campaignPerformance.attribution.googleConversionsTotal.toLocaleString(
                "tr-TR",
              )}
            </strong>
            . WhatsApp linklerinin{" "}
            <code className="rounded bg-amber-100 px-1">
              endoskopikbelameliyati.com/r?...&amp;gclid=...
            </code>{" "}
            üzerinden gitmesi gerekir; aksi halde kampanya eşleşmesi yapılamaz.
          </p>
          <Link
            href="#wa-bridge-setup"
            className="mt-2 mr-4 inline-block font-semibold text-amber-900 underline"
          >
            WordPress kurulum kodu →
          </Link>
          <Link
            href={buildMarketingHref({
              period,
              site: MARKETING_CLICK_LOGS_SITE,
              platform,
              event,
              q: search,
            })}
            className="mt-2 inline-block font-semibold text-amber-900 underline"
          >
            Ana site CRM lead&apos;lerini gör →
          </Link>
        </div>
      ) : null}

      {summary ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Toplam harcama"
              value={formatTry(summary.total_spend)}
              hint={formatMarketingDateRangeTr(startDate, endDate)}
            />
            <SummaryCard
              label="Toplam lead (CRM)"
              value={String(summary.total_leads)}
              hint="Form / WhatsApp — platforma göre (gclid, Meta clid)"
            />
            <SummaryCard
              label="CPL (CRM)"
              value={formatTry(summary.cpl)}
              hint="Harcama ÷ CRM lead"
            />
            <SummaryCard
              label="Lead → Randevu"
              value={formatPct(summary.appointment_rate)}
              hint={`${summary.appointment_leads} randevulu/bitti`}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#123524]/08 bg-white p-5 sm:p-6">
              <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
                Günlük harcama vs lead
              </h2>
              <p className="mt-1 text-sm text-[#466254]">
                Seçili tarih aralığı
              </p>
              <div className="mt-4">
                <MarketingDailyChart daily={summary.daily} />
              </div>
            </section>

            <section className="rounded-2xl border border-[#123524]/08 bg-white p-5 sm:p-6">
              <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
                Platform karşılaştırma
              </h2>
              <p className="mt-1 text-sm text-[#466254]">
                Google Ads vs Meta
              </p>
              <div className="mt-5">
                <MarketingPlatformBars
                  summary={summary}
                  googleConversions={
                    campaignPerformance.attribution.googleConversionsTotal
                  }
                />
              </div>
            </section>
          </div>
        </>
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Özet alınamadı. Migration uygulandı mı? (
          <code>20260901180000_marketing_api.sql</code>)
        </p>
      )}

      <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
          Kampanya performansı
        </h2>
        <p className="mt-1 text-sm text-[#466254]">
          Harcama ve tıklama Google/Meta API&apos;den; dönüşüm ve CRM lead ayrı
          sütunlarda.
        </p>
        <MarketingCampaignTable performance={campaignPerformance} />
      </section>

      <MarketingGoogleLeadsSection
        summary={googleLeads}
        crmLeads={summary?.total_leads ?? 0}
      />

      <Suspense
        key={`${startDate}-${endDate}-${siteFilter ?? "all"}`}
        fallback={<MarketingGoogleInsightsFallback />}
      >
        <MarketingGoogleInsightsSection
          startDate={startDate}
          endDate={endDate}
          siteFilter={siteFilter}
          period={period}
        />
      </Suspense>

      {unmatched.length ? (
        <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            Eşleşmemiş kampanyalar
          </h2>
          <p className="mt-1 text-sm text-[#466254]">
            Sync sonrası hâlâ listede ise{" "}
            <strong>Veriyi şimdi çek (sync)</strong> çalıştırın. Google hesap
            haritası{" "}
            <Link href="/admin/marketing/connect" className="text-[#0b6b45]">
              connect
            </Link>{" "}
            sayfasında; kampanya adında <code>[PREFIX]</code> varsa o önceliklidir.
          </p>
          <div className="mt-4 space-y-2">
            {unmatched.map((campaign) => (
              <UnmatchedCampaignRow
                key={campaign.id}
                campaign={campaign}
                siteOptions={siteOptions}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div id="wa-bridge-setup">
        <MarketingWaBridgeSetup />
      </div>

      {siteFilter === MARKETING_CLICK_LOGS_SITE ? (
        <MarketingLeadSourcesSection
          period={period}
          startDate={startDate}
          endDate={endDate}
          siteFilter={siteFilter}
          platform={platform}
          event={event}
          search={search}
        />
      ) : null}
    </div>
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
