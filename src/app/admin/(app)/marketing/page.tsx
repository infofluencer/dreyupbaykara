import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, Link2, TrendingUp } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  loadAdAccountsSafe,
  loadCustomerSiteMap,
  loadSiteOptions,
  loadUnmatchedCampaigns,
} from "@/lib/marketing/admin-stats";
import { MARKETING_CLICK_LOGS_SITE, isMarketingAdSite } from "@/lib/marketing/constants";
import {
  resolveMarketingDateRange,
  pickMarketingQueryParam,
} from "@/lib/marketing/date-range";
import {
  MarketingGoogleInsightsFallback,
  MarketingGoogleInsightsSection,
} from "@/components/admin/MarketingGoogleInsightsSection";
import {
  MarketingCampaignPerformanceFallback,
  MarketingCampaignPerformanceSection,
} from "@/components/admin/MarketingCampaignPerformanceSection";
import {
  MarketingSummaryFallback,
  MarketingSummarySection,
} from "@/components/admin/MarketingSummarySection";
import { MarketingLeadSourcesSection } from "@/components/admin/MarketingLeadSourcesSection";
import { MarketingFilterBar } from "@/components/admin/MarketingFilterBar";
import {
  MarketingChannelTabs,
  type MarketingChannel,
} from "@/components/admin/MarketingChannelTabs";
import { buildMarketingHref } from "@/lib/marketing/urls";
import { UnmatchedCampaignRow } from "@/components/admin/UnmatchedCampaignRow";
import { MarketingMetaAccountSites } from "@/components/admin/MarketingMetaAccountSites";
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

function parseChannel(raw?: string): MarketingChannel {
  return raw === "meta" ? "meta" : "google";
}

export default async function AdminMarketingPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string | string[];
    start?: string | string[];
    end?: string | string[];
    site?: string | string[];
    channel?: string | string[];
    platform?: string | string[];
    event?: string | string[];
    q?: string | string[];
  }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant", "agency"]);
  const raw = await searchParams;
  const query = {
    period: pickMarketingQueryParam(raw.period),
    start: pickMarketingQueryParam(raw.start),
    end: pickMarketingQueryParam(raw.end),
    site: pickMarketingQueryParam(raw.site),
    channel: pickMarketingQueryParam(raw.channel),
    platform: pickMarketingQueryParam(raw.platform),
    event: pickMarketingQueryParam(raw.event),
    q: pickMarketingQueryParam(raw.q),
  };
  const { startDate, endDate, period } = resolveMarketingDateRange(query);
  const siteFilter = query.site?.trim() || null;
  const channel = parseChannel(query.channel);
  const adPlatform = channel === "meta" ? "meta" : "google_ads";
  const platform = parsePlatform(query.platform);
  const event = parseEvent(query.event);
  const search = query.q?.trim() || "";

  // Sadece hafif sorgular — özet/kampanya Suspense ile ayrı
  const [unmatched, siteOptions, accounts, metaSiteMap] = await Promise.all([
    loadUnmatchedCampaigns(),
    loadSiteOptions(),
    loadAdAccountsSafe(),
    channel === "meta" ? loadCustomerSiteMap("meta") : Promise.resolve({}),
  ]);

  const inactiveAccounts = accounts.filter((a) => !a.is_active || !a.has_token);
  const hasAccounts = accounts.some((a) => a.is_active && a.has_token);
  const googleConnected = accounts.some(
    (a) => a.platform === "google_ads" && a.is_active && a.has_token,
  );
  const metaConnected = accounts.some(
    (a) => a.platform === "meta" && a.is_active && a.has_token,
  );
  const metaAccounts = accounts.filter((a) => a.platform === "meta");

  const unmatchedForChannel = unmatched.filter((c) =>
    channel === "meta" ? c.platform === "meta" : c.platform === "google_ads",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight">
            Reklam
          </h1>
          <p className="mt-2 text-sm text-[#466254]">
            Google Ads ve Meta harcama, dönüşüm ve CRM lead — kanal seçerek
            yönetin. Veri gece 02:00’de otomatik yenilenir (son 30 gün). 720
            günlük geçmiş bir kez curl ile çekilir. Uzun aralıklar için
            varsayılan 1–3 ay kullanın.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Link
            href="/admin/marketing/connect"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#123524]/12 bg-white px-4 text-sm font-semibold text-[#123524] hover:border-[#0b6b45]/30"
          >
            <Link2 className="h-4 w-4" />
            Hesap bağla
          </Link>
        </div>
      </div>

      <MarketingChannelTabs
        channel={channel}
        period={period}
        startDate={startDate}
        endDate={endDate}
        siteFilter={siteFilter}
        event={event}
        search={search}
        googleConnected={googleConnected}
        metaConnected={metaConnected}
      />

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
        channel={channel}
        platform={platform}
        event={event}
        search={search}
        siteOptions={siteOptions}
      />

      {channel === "google" ? (
        <Suspense
          key={`google-${startDate}-${endDate}-${siteFilter ?? "all"}`}
          fallback={<MarketingGoogleInsightsFallback />}
        >
          <MarketingGoogleInsightsSection
            startDate={startDate}
            endDate={endDate}
            siteFilter={siteFilter}
            period={period}
          />
        </Suspense>
      ) : (
        <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <div>
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
              Meta hesapları
            </h2>
            <p className="mt-1 text-sm text-[#466254]">
              Kampanya ve harcama her gece 02:00’de yenilenir. 720 günlük
              geçmiş connect sayfasındaki curl ile bir kez çekilir.
            </p>
          </div>

          {metaAccounts.length ? (
            <MarketingMetaAccountSites
              accounts={metaAccounts}
              sitesByExternalId={metaSiteMap}
              siteOptions={siteOptions}
            />
          ) : (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Meta hesabı bağlı değil.{" "}
              <Link
                href="/admin/marketing/connect"
                className="font-semibold underline"
              >
                Hesap bağla
              </Link>{" "}
              veya env&apos;e <code>META_ACCESS_TOKEN</code> +{" "}
              <code>META_AD_ACCOUNT_IDS</code> ekleyin.
            </p>
          )}
        </section>
      )}

      {channel === "google" &&
      siteFilter === "endoskopikbelameliyati" ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          <p className="font-semibold">Bu sitede aktif Google reklamı yok</p>
          <p className="mt-1">
            Harcama{" "}
            <Link
              href={buildMarketingHref({
                period,
                site: "endospineistanbul",
                channel,
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
                channel,
                platform,
                event,
                q: search,
              })}
              className="font-semibold underline"
            >
              fitikameliyati
            </Link>{" "}
            hesaplarında.
          </p>
        </div>
      ) : null}

      {channel === "google" &&
      siteFilter &&
      isMarketingAdSite(siteFilter) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">CRM lead genelde ana sitede</p>
          <p className="mt-1">
            Reklam sitesi filtresinde CRM eşleşmesi için gclid/utm gerekir.
          </p>
          <Link
            href={buildMarketingHref({
              period,
              site: MARKETING_CLICK_LOGS_SITE,
              channel,
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

      {channel === "meta" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">
            CRM lead, Meta Ads Manager&apos;daki mesaj/lead sayısı değil
          </p>
          <p className="mt-1">
            Kart yalnızca CRM kaydında <strong>fbclid</strong>,{" "}
            <strong>Click-to-WhatsApp (ctwa_clid)</strong> veya Meta UTM olan
            lead&apos;leri sayar.
          </p>
        </div>
      ) : null}

      <Suspense
        key={`summary-${startDate}-${endDate}-${siteFilter ?? "all"}-${channel}`}
        fallback={<MarketingSummaryFallback />}
      >
        <MarketingSummarySection
          startDate={startDate}
          endDate={endDate}
          siteFilter={siteFilter}
          channel={channel}
        />
      </Suspense>

      <Suspense
        key={`campaigns-${adPlatform}-${startDate}-${endDate}-${siteFilter ?? "all"}`}
        fallback={<MarketingCampaignPerformanceFallback />}
      >
        <MarketingCampaignPerformanceSection
          startDate={startDate}
          endDate={endDate}
          siteFilter={siteFilter}
          adPlatform={adPlatform}
          channelLabel={channel === "meta" ? "Meta" : "Google Ads"}
          showGoogleLeads={channel === "google"}
        />
      </Suspense>

      {unmatchedForChannel.length ? (
        <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            Eşleşmemiş kampanyalar
          </h2>
          <p className="mt-1 text-sm text-[#466254]">
            Sync sonrası hâlâ listede ise{" "}
            <Link href="/admin/marketing/connect" className="text-[#0b6b45]">
              connect
            </Link>{" "}
            sayfasında site eşlemesi yapılabilir. Cron geçmişi doldurunca da
            kalırlarsa isim öneki veya manuel eşleme gerekir.
          </p>
          <div className="mt-4 space-y-2">
            {unmatchedForChannel.map((campaign) => (
              <UnmatchedCampaignRow
                key={campaign.id}
                campaign={campaign}
                siteOptions={siteOptions}
              />
            ))}
          </div>
        </section>
      ) : null}

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
