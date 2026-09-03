import Link from "next/link";
import { Suspense } from "react";
import { AdminHomeSiteFilter } from "@/components/admin/AdminHomeSiteFilter";
import { AdminMarketingHomeCard } from "@/components/admin/AdminMarketingHomeCard";
import { AdminSourcePie } from "@/components/admin/AdminSourcePie";
import { Skeleton } from "@/components/admin/AdminSkeleton";
import {
  loadAdminHomeSourceStats,
  loadAdminHomeWaStats,
} from "@/lib/crm/admin-home-stats";
import {
  EVENT_COLOR,
  EVENT_LABEL,
  PLATFORM_COLOR,
  PLATFORM_LABEL,
} from "@/lib/crm/source-kind";
import { loadSiteOptions } from "@/lib/marketing/admin-stats";
import { isWhatsAppEnabled } from "@/lib/whatsapp/config";

const PLATFORMS = ["google_ads", "meta", "other", "organic"] as const;
const EVENTS = ["landing", "whatsapp", "form"] as const;

export function AdminHomeInsightsFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Özet istatistikler yükleniyor">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export async function AdminHomeInsights({
  siteFilter = null,
}: {
  siteFilter?: string | null;
}) {
  const apiEnabled = isWhatsAppEnabled();
  const [wa, sources, siteOptions] = await Promise.all([
    loadAdminHomeWaStats(),
    loadAdminHomeSourceStats(siteFilter),
    loadSiteOptions(),
  ]);

  const marketingHref = siteFilter
    ? `/admin/marketing?site=${encodeURIComponent(siteFilter)}`
    : "/admin/marketing";

  return (
    <>
      <Link
        href="/admin/messages"
        className="relative block rounded-2xl border border-[#123524]/08 bg-white px-5 py-5 transition active:border-[#0b6b45]/30"
      >
        {!apiEnabled ? (
          <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-900">
            API bağlı değil
          </span>
        ) : null}
        <p className="text-sm font-semibold text-[#0b6b45]">WhatsApp</p>
        <p className="mt-1 text-sm text-[#466254]">
          Gelen kutusu özeti — tıklayınca mesajlara gidin
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <div>
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold text-[#123524]">
              Kayıt kaynakları
            </h2>
            <p className="mt-0.5 text-sm text-[#466254]">
              Siteye göre filtreleyin
            </p>
          </div>
          <Suspense
            fallback={
              <div className="h-10 w-44 animate-pulse rounded-xl bg-[#eef2f0]" />
            }
          >
            <AdminHomeSiteFilter
              siteOptions={siteOptions}
              currentSite={siteFilter}
            />
          </Suspense>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <AdminSourcePie
            title="Kaynaklar"
            hint="Reklam / organik dağılım"
            totalLabel="kayıt"
            href={marketingHref}
            slices={PLATFORMS.map((id) => ({
              id,
              label: PLATFORM_LABEL[id],
              value: sources.platforms[id],
              color: PLATFORM_COLOR[id],
              href: siteFilter
                ? `/admin/marketing?platform=${id}&site=${encodeURIComponent(siteFilter)}`
                : `/admin/marketing?platform=${id}`,
            }))}
          />
          <AdminSourcePie
            title="Ne yaptı?"
            hint="Site, WhatsApp veya form"
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
      </div>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-[#466254]">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold text-[#123524]">
        {value}
      </p>
    </div>
  );
}
