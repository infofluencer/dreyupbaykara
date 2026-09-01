import Link from "next/link";
import { AlertTriangle, Link2, TrendingUp } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  defaultMarketingDateRange,
  loadAdAccountsSafe,
  loadCampaignPerformance,
  loadMarketingSummary,
  loadSiteOptions,
  loadUnmatchedCampaigns,
} from "@/lib/marketing/admin-stats";
import {
  MarketingDailyChart,
  MarketingPlatformBars,
} from "@/components/admin/MarketingCharts";
import { formatPct, formatTry } from "@/lib/marketing/format";
import { UnmatchedCampaignRow } from "@/components/admin/UnmatchedCampaignRow";
import { PLATFORM_LABEL } from "@/lib/crm/source-kind";

function marketingHref(opts: {
  start?: string;
  end?: string;
  site?: string;
}) {
  const params = new URLSearchParams();
  if (opts.start) params.set("start", opts.start);
  if (opts.end) params.set("end", opts.end);
  if (opts.site) params.set("site", opts.site);
  const q = params.toString();
  return q ? `/admin/marketing?${q}` : "/admin/marketing";
}

export default async function AdminMarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; site?: string }>;
}) {
  await requireAdminSession(["admin", "doctor", "assistant", "agency"]);
  const query = await searchParams;
  const defaults = defaultMarketingDateRange(30);
  const startDate = query.start || defaults.startDate;
  const endDate = query.end || defaults.endDate;
  const siteFilter = query.site?.trim() || null;

  const [summary, campaigns, unmatched, siteOptions, accounts] =
    await Promise.all([
      loadMarketingSummary(startDate, endDate, siteFilter),
      loadCampaignPerformance(startDate, endDate, siteFilter),
      loadUnmatchedCampaigns(),
      loadSiteOptions(),
      loadAdAccountsSafe(),
    ]);

  const inactiveAccounts = accounts.filter((a) => !a.is_active || !a.has_token);
  const hasAccounts = accounts.some((a) => a.is_active && a.has_token);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tracking-tight">
            Reklam performansı
          </h1>
          <p className="mt-2 text-sm text-[#466254]">
            Google Ads + Meta harcama, lead ve CPL — site bazlı filtre.
          </p>
        </div>
        <Link
          href="/admin/marketing/connect"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#123524]/12 bg-white px-4 text-sm font-semibold text-[#123524] hover:border-[#0b6b45]/30"
        >
          <Link2 className="h-4 w-4" />
          Hesap bağla
        </Link>
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

      <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
        <form action="/admin/marketing" className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
              Başlangıç
            </span>
            <input
              type="date"
              name="start"
              defaultValue={startDate}
              className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
              Bitiş
            </span>
            <input
              type="date"
              name="end"
              defaultValue={endDate}
              className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm lg:min-w-[14rem]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#466254]">
              Site
            </span>
            <select
              name="site"
              defaultValue={siteFilter ?? ""}
              className="min-h-10 rounded-xl border border-[#123524]/12 bg-[#f7f9f8] px-3"
            >
              <option value="">Tüm siteler</option>
              {siteOptions.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </label>
          <button className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#123524] px-5 text-sm font-semibold text-white">
            Uygula
          </button>
          {siteFilter ? (
            <Link
              href={marketingHref({ start: startDate, end: endDate })}
              className="inline-flex min-h-10 items-center justify-center text-sm font-semibold text-[#466254]"
            >
              Site filtresini kaldır
            </Link>
          ) : null}
        </form>
      </section>

      {summary ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Toplam harcama"
              value={formatTry(summary.total_spend)}
              hint={`${startDate} – ${endDate}`}
            />
            <SummaryCard
              label="Toplam lead"
              value={String(summary.total_leads)}
              hint="Eşleşmiş leads kayıtları"
            />
            <SummaryCard
              label="CPL"
              value={formatTry(summary.cpl)}
              hint="Harcama / lead"
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
                <MarketingPlatformBars summary={summary} />
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
          Harcama API&apos;den; lead sayısı utm_campaign eşleşmesiyle.
        </p>
        {!campaigns.length ? (
          <p className="mt-4 text-sm text-[#466254]">
            Kampanya verisi yok. Sync sonrası burada görünür.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-[#123524]/08 bg-[#f7f9f8] text-[#466254]">
                <tr>
                  <th className="px-3 py-2 font-medium">Kampanya</th>
                  <th className="px-3 py-2 font-medium">Site</th>
                  <th className="px-3 py-2 font-medium">Platform</th>
                  <th className="px-3 py-2 font-medium">Harcama</th>
                  <th className="px-3 py-2 font-medium">Tıklama</th>
                  <th className="px-3 py-2 font-medium">Lead</th>
                  <th className="px-3 py-2 font-medium">CPL</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#123524]/06 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-[#123524]">
                      {row.name}
                    </td>
                    <td className="px-3 py-2 text-[#466254]">
                      {row.site || (
                        <span className="text-amber-700">eşleşmedi</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {PLATFORM_LABEL[row.platform]}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatTry(row.spend)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{row.clicks}</td>
                    <td className="px-3 py-2 tabular-nums">{row.leads}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatTry(row.cpl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {unmatched.length ? (
        <section className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            Eşleşmemiş kampanyalar
          </h2>
          <p className="mt-1 text-sm text-[#466254]">
            Kampanya adında <code>[PREFIX]</code> yok veya prefix tanımlı
            değil. Manuel site atayın veya{" "}
            <Link href="/admin/marketing/connect" className="text-[#0b6b45]">
              prefix map
            </Link>{" "}
            güncelleyin.
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
