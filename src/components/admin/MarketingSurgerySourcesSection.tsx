import { Suspense } from "react";
import { AdminSourcePie } from "@/components/admin/AdminSourcePie";
import { Skeleton } from "@/components/admin/AdminSkeleton";
import {
  PLATFORM_COLOR,
  SURGERY_PLATFORM_LABEL,
  type AdPlatform,
} from "@/lib/crm/source-kind";
import { formatMarketingDateRangeTr } from "@/lib/marketing/date-range";
import { loadSurgerySourceStats } from "@/lib/marketing/surgery-sources";
import { buildMarketingHref } from "@/lib/marketing/urls";

const PLATFORMS: AdPlatform[] = ["google_ads", "meta", "organic", "other"];

export function MarketingSurgerySourcesFallback() {
  return (
    <div
      className="grid gap-3 sm:gap-4 lg:grid-cols-2"
      aria-busy="true"
      aria-label="Ameliyat kaynakları yükleniyor"
    >
      <Skeleton className="h-72 w-full rounded-2xl sm:h-56" />
      <Skeleton className="h-40 w-full rounded-2xl sm:h-56" />
    </div>
  );
}

export async function MarketingSurgerySourcesSection({
  startDate,
  endDate,
  siteFilter,
  period,
  channel,
}: {
  startDate: string;
  endDate: string;
  siteFilter: string | null;
  period: string;
  channel: "google" | "meta";
}) {
  const stats = await loadSurgerySourceStats(startDate, endDate, siteFilter);
  const rangeLabel = formatMarketingDateRangeTr(startDate, endDate);
  const siteLabel = siteFilter ?? "tüm siteler";

  const slices = PLATFORMS.map((id) => ({
    id,
    label: SURGERY_PLATFORM_LABEL[id],
    value: stats.platforms[id],
    color: PLATFORM_COLOR[id],
    href: buildMarketingHref({
      period,
      start: startDate,
      end: endDate,
      channel,
      platform: id,
      site: siteFilter ?? undefined,
    }),
  }));

  const top =
    stats.total > 0
      ? [...PLATFORMS]
          .map((id) => ({
            id,
            label: SURGERY_PLATFORM_LABEL[id],
            value: stats.platforms[id],
            pct: Math.round((stats.platforms[id] / stats.total) * 100),
          }))
          .sort((a, b) => b.value - a.value)[0]
      : null;

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
      <AdminSourcePie
        title="Ameliyat — kaynak"
        hint={`Dönemde ameliyat · ${rangeLabel} · ${siteLabel}. İz yok = sinyal yok (eski kayıtlar); yeni Ref/CTWA otomatik.`}
        totalLabel="ameliyat"
        slices={slices}
      />

      <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-6">
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
          Özet
        </h2>
        <p className="mt-1 text-sm text-[#466254]">
          {rangeLabel} · {siteLabel}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f4f6f5] px-3 py-3">
            <dt className="text-xs text-[#466254]">Toplam ameliyat</dt>
            <dd className="mt-1 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tabular-nums text-[#123524]">
              {stats.total}
            </dd>
          </div>
          <div className="rounded-xl bg-[#f4f6f5] px-3 py-3">
            <dt className="text-xs text-[#466254]">Öne çıkan kaynak</dt>
            <dd className="mt-1 font-[family-name:var(--font-instrument-sans)] text-lg font-semibold text-[#123524]">
              {top && top.value > 0 ? (
                <>
                  {top.label}{" "}
                  <span className="tabular-nums text-[#466254]">
                    {top.pct}%
                  </span>
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>

        <ul className="mt-5 space-y-2 text-sm text-[#466254]">
          <li>
            <span className="font-semibold text-[#123524]">Google</span> —
            gclid / Google UTM
          </li>
          <li>
            <span className="font-semibold text-[#123524]">Meta</span> — fbclid,
            Click-to-WhatsApp veya Meta UTM
          </li>
          <li>
            <span className="font-semibold text-[#123524]">İz yok</span> —
            CRM’de reklam sinyali yok. Eski takvim/manuel kayıtlar buraya
            düşer; “organik geldi” demek değildir. Yeni hastalarda Ref/CTWA
            varsa otomatik Meta/Google yazılır.
          </li>
          <li>
            <span className="font-semibold text-[#123524]">Bilinmiyor</span> —
            başka UTM / sınıflanamayan
          </li>
        </ul>
      </section>
    </div>
  );
}

/** Suspense sarmalayıcı — marketing sayfasında kullan. */
export function MarketingSurgerySources({
  startDate,
  endDate,
  siteFilter,
  period,
  channel,
}: {
  startDate: string;
  endDate: string;
  siteFilter: string | null;
  period: string;
  channel: "google" | "meta";
}) {
  return (
    <Suspense
      key={`surgery-src-${startDate}-${endDate}`}
      fallback={<MarketingSurgerySourcesFallback />}
    >
      <MarketingSurgerySourcesSection
        startDate={startDate}
        endDate={endDate}
        siteFilter={siteFilter}
        period={period}
        channel={channel}
      />
    </Suspense>
  );
}
