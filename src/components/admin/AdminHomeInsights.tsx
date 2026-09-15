import Link from "next/link";
import { Suspense } from "react";
import { AdminHomeSiteFilter } from "@/components/admin/AdminHomeSiteFilter";
import { AdminMarketingHomeCard } from "@/components/admin/AdminMarketingHomeCard";
import { AdminSourcePie } from "@/components/admin/AdminSourcePie";
import { AdminSurgerySourcePanel } from "@/components/admin/AdminSurgerySourcePanel";
import { Skeleton } from "@/components/admin/AdminSkeleton";
import {
  loadAdminHomeSourceStats,
  loadAdminHomeWaStats,
} from "@/lib/crm/admin-home-stats";
import {
  EVENT_COLOR,
  EVENT_LABEL,
  PLATFORM_COLOR,
} from "@/lib/crm/source-kind";
import { istanbulYmd } from "@/lib/date/tr";
import { loadSiteOptions } from "@/lib/marketing/admin-stats";
import { formatMarketingDateRangeTr } from "@/lib/marketing/date-range";
import { loadGa4TrafficSourceStats } from "@/lib/marketing/ga4/client";
import { loadSurgerySourceStats } from "@/lib/marketing/surgery-sources";
import { createClient } from "@/lib/supabase/server";
import { isWhatsAppEnabled } from "@/lib/whatsapp/config";

const PLATFORMS = ["google_ads", "meta", "other", "organic"] as const;
const EVENTS = ["landing", "whatsapp", "form"] as const;

const TRAFFIC_LABEL: Record<(typeof PLATFORMS)[number], string> = {
  google_ads: "Google",
  meta: "Meta",
  organic: "Organik",
  other: "Diğer",
};

function last30DayRange() {
  const end = istanbulYmd();
  const endDate = new Date(`${end}T12:00:00+03:00`);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 29);
  const start = istanbulYmd(startDate.toISOString());
  return { start, end };
}

export function AdminHomeInsightsFallback() {
  return (
    <div
      className="space-y-3 sm:space-y-4"
      aria-busy="true"
      aria-label="Özet istatistikler yükleniyor"
    >
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-2xl sm:h-56" />
        <Skeleton className="h-72 w-full rounded-2xl sm:h-56" />
      </div>
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}

export async function AdminHomeInsights({
  siteFilter = null,
}: {
  siteFilter?: string | null;
}) {
  const apiEnabled = isWhatsAppEnabled();
  const { start, end } = last30DayRange();
  const rangeLabel = formatMarketingDateRangeTr(start, end);
  const supabase = await createClient();

  const [wa, sources, siteOptions, surgery, traffic] = await Promise.all([
    loadAdminHomeWaStats(),
    loadAdminHomeSourceStats(siteFilter),
    loadSiteOptions(),
    loadSurgerySourceStats(start, end, null),
    loadGa4TrafficSourceStats(supabase, start, end),
  ]);

  const marketingHref = siteFilter
    ? `/admin/marketing?site=${encodeURIComponent(siteFilter)}`
    : "/admin/marketing";

  return (
    <>
      <Link
        href="/admin/messages"
        className="relative block rounded-2xl border border-[#123524]/08 bg-white px-4 py-4 transition active:border-[#0b6b45]/30 sm:px-5 sm:py-5"
      >
        {!apiEnabled ? (
          <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900 sm:right-4 sm:top-4">
            API bağlı değil
          </span>
        ) : null}
        <p className="text-sm font-semibold text-[#0b6b45]">WhatsApp</p>
        <p className="mt-1 max-w-[22rem] text-sm text-pretty text-[#466254] sm:max-w-none">
          Gelen kutusu özeti — tıklayınca mesajlara gidin
        </p>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
          <MiniStat label="Açık konuşma" value={wa.open} />
          <MiniStat label="Okunmamış" value={wa.unread} />
          <MiniStat label="Bugün gelen" value={wa.todayInbound} />
          <MiniStat label="Yanıt bekleyen" value={wa.awaiting} />
        </div>
      </Link>

      <Suspense fallback={null}>
        <AdminMarketingHomeCard />
      </Suspense>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold text-[#123524]">
              Site trafiği
            </h2>
            <p className="mt-0.5 text-sm text-[#466254]">
              Sol: GA4 aktif kullanıcı ({rangeLabel}). Sağ: izlenen tıklama /
              WA Ref kayıtları.
            </p>
          </div>
          <Suspense
            fallback={
              <div className="h-11 w-full animate-pulse rounded-xl bg-[#eef2f0] sm:w-44" />
            }
          >
            <AdminHomeSiteFilter
              siteOptions={siteOptions}
              currentSite={siteFilter}
            />
          </Suspense>
        </div>

        {traffic.error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">GA4 site trafiği alınamadı</p>
            <p className="mt-1">{traffic.error}</p>
            {traffic.needsReconnect ? (
              <Link
                href="/admin/marketing/connect"
                className="mt-2 inline-block font-semibold underline"
              >
                Google’ı Analytics yetkisiyle yeniden bağla →
              </Link>
            ) : null}
            {!traffic.propertyId ? (
              <p className="mt-2 text-xs">
                Env: <code>GA4_PROPERTY_ID=474676141,524968102,549325905</code>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <AdminSourcePie
            title="Site ziyaretçileri"
            hint={`${rangeLabel} · GA4 aktif kullanıcı · Google / Meta / organik`}
            totalLabel="kişi"
            href={marketingHref}
            slices={PLATFORMS.map((id) => ({
              id,
              label: TRAFFIC_LABEL[id],
              value: traffic.platforms[id],
              color: PLATFORM_COLOR[id],
              href: marketingHref,
            }))}
          />
          <AdminSourcePie
            title="Ne yaptı? (izlenen)"
            hint="Tüm zamanlar · site inişi / WA linki / form (lead_sources kayıt)"
            totalLabel="kayıt"
            href={marketingHref}
            slices={EVENTS.map((id) => ({
              id,
              label: EVENT_LABEL[id],
              value: sources.events[id],
              color: EVENT_COLOR[id],
              href: siteFilter
                ? `/admin/marketing?event=${id}&site=${encodeURIComponent(siteFilter)}`
                : `/admin/marketing?event=${id}`,
            }))}
          />
        </div>

        <AdminSurgerySourcePanel
          title="Ameliyat — kaynak (30 gün)"
          hint="Tüm siteler · pasta dilimine tıklayınca liste filtrelenir. Kaynak WhatsApp Ref / CTWA / click ID ile tespit edilir."
          total={surgery.total}
          platforms={surgery.platforms}
          patients={surgery.patients}
          href="/admin/marketing"
        />
      </div>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[#466254]">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tabular-nums text-[#123524]">
        {value}
      </p>
    </div>
  );
}
