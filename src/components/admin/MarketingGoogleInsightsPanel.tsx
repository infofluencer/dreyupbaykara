"use client";

import type { GoogleMarketingInsights } from "@/lib/marketing/admin-stats";
import {
  formatMarketingDateRangeTr,
  marketingPeriodLabel,
  type MarketingPeriod,
} from "@/lib/marketing/date-range";
import { formatPct, formatTry } from "@/lib/marketing/format";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[#123524]/06 bg-[#f7f9f8] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#466254]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-instrument-sans)] text-2xl font-semibold tabular-nums text-[#123524]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] text-[#466254]/80">{hint}</p>
      ) : null}
    </div>
  );
}

function DeviceBreakdown({
  rows,
  totalSpend,
}: {
  rows: GoogleMarketingInsights["devices"];
  totalSpend: number;
}) {
  if (!rows.length) {
    return (
      <p className="py-4 text-sm text-[#466254]">
        Cihaz kırılımı yok — sync sonrası dolar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const share =
          totalSpend > 0 ? Math.round((row.spend / totalSpend) * 100) : 0;
        return (
          <div key={row.device}>
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#123524]">
                  {row.device}
                </p>
                <p className="text-[11px] text-[#466254]">
                  {row.clicks.toLocaleString("tr-TR")} tık ·{" "}
                  {row.conversions.toLocaleString("tr-TR")} dönüşüm
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums text-[#123524]">
                  {formatTry(row.spend)}
                </p>
                <p className="text-[11px] tabular-nums text-[#466254]">
                  %{share}
                </p>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#eef2f0]">
              <div
                className="h-full rounded-full bg-[#1a56db]"
                style={{ width: `${Math.max(share, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: Array<{ key: string; label: string; align?: "right" }>;
  rows: Array<Record<string, string | number>>;
  empty: string;
}) {
  if (!rows.length) {
    return <p className="py-4 text-sm text-[#466254]">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[#123524]/08 text-left text-[11px] font-semibold uppercase tracking-wide text-[#466254]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`pb-2 pr-3 ${column.align === "right" ? "text-right" : ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${String(row[columns[0].key])}-${index}`}
              className="border-t border-[#123524]/06"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`py-2.5 pr-3 ${
                    column.align === "right"
                      ? "text-right tabular-nums"
                      : column.key === columns[0].key
                        ? "max-w-[14rem] truncate font-medium text-[#123524]"
                        : "tabular-nums text-[#466254]"
                  }`}
                >
                  {column.key === "spend"
                    ? formatTry(Number(row[column.key]))
                    : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarketingGoogleInsightsPanel({
  insights,
  period,
  startDate,
  endDate,
  siteFilter,
}: {
  insights: GoogleMarketingInsights | null;
  period: MarketingPeriod;
  startDate: string;
  endDate: string;
  siteFilter: string | null;
}) {
  if (!insights) return null;

  const hasData =
    insights.devices.length ||
    insights.searchTerms.length ||
    insights.totalSpend > 0;

  const filterLabel = [
    marketingPeriodLabel(period),
    formatMarketingDateRangeTr(startDate, endDate),
    siteFilter ? `Site: ${siteFilter}` : "Tüm siteler",
  ].join(" · ");

  if (!hasData) {
    return (
      <section className="rounded-2xl border border-dashed border-[#123524]/15 bg-white p-5">
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
          Google Ads detay
        </h2>
        <p className="mt-2 text-sm text-[#466254]">
          Seçili filtre için Google verisi yok. Farklı site/tarih deneyin veya{" "}
          <strong>Veriyi şimdi çek (sync)</strong> çalıştırın.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
            Google Ads detay
          </h2>
          <p className="mt-1 text-sm text-[#466254]">{filterLabel}</p>
        </div>
        <div className="rounded-xl bg-[#e8f0fe] px-3 py-2 text-xs font-semibold text-[#1a56db]">
          Google harcama {formatTry(insights.totalSpend)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Harcama"
          value={formatTry(insights.totalSpend)}
          hint={`${insights.totalClicks.toLocaleString("tr-TR")} tıklama`}
        />
        <MetricCard
          label="Google dönüşüm"
          value={insights.totalConversions.toLocaleString("tr-TR")}
          hint={
            insights.googleCostPerConversion != null
              ? `CPA ${formatTry(insights.googleCostPerConversion)}`
              : "Kampanya bazlı toplam"
          }
        />
        <MetricCard
          label="Ort. CPC"
          value={insights.avgCpc != null ? formatTry(insights.avgCpc) : "—"}
          hint={
            insights.avgCtr != null
              ? `CTR ${formatPct(insights.avgCtr)}`
              : "Tıklama başına maliyet"
          }
        />
        <MetricCard
          label="Gösterim payı"
          value={
            insights.avgImpressionShare != null
              ? formatPct(insights.avgImpressionShare)
              : "—"
          }
          hint={
            insights.budgetLostShare != null || insights.rankLostShare != null
              ? [
                  insights.budgetLostShare != null
                    ? `Bütçe kaybı ${formatPct(insights.budgetLostShare)}`
                    : null,
                  insights.rankLostShare != null
                    ? `Sıra kaybı ${formatPct(insights.rankLostShare)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Search kampanyaları"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[#123524]">
            Cihaz dağılımı
          </h3>
          <p className="mt-1 text-xs text-[#466254]">
            Harcama payı ve dönüşüm özeti
          </p>
          <div className="mt-4">
            <DeviceBreakdown
              rows={insights.devices}
              totalSpend={insights.totalSpend}
            />
          </div>
        </article>

        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[#123524]">
            Dönüşüm aksiyonları
          </h3>
          <p className="mt-1 text-xs text-[#466254]">
            Google Ads conversion tag kırılımı
          </p>
          <div className="mt-4">
            {insights.conversionActions.length ? (
              <DataTable
                columns={[
                  { key: "name", label: "Aksiyon" },
                  { key: "conversions", label: "Dönüşüm", align: "right" },
                  { key: "spend", label: "Harcama", align: "right" },
                ]}
                rows={insights.conversionActions.map((row) => ({
                  name: row.name,
                  conversions: row.conversions.toLocaleString("tr-TR"),
                  spend: row.spend,
                }))}
                empty=""
              />
            ) : (
              <div className="rounded-xl bg-[#f7f9f8] px-4 py-3 text-sm text-[#466254]">
                <p>
                  Aksiyon kırılımı henüz yok. Toplam Google dönüşüm:{" "}
                  <strong className="text-[#123524]">
                    {insights.totalConversions.toLocaleString("tr-TR")}
                  </strong>
                  .
                </p>
                <p className="mt-2 text-xs">
                  Bir sonraki sync&apos;te conversion action verisi dolabilir.
                </p>
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-semibold text-[#123524]">
              Top arama terimleri
            </h3>
            <p className="mt-1 text-xs text-[#466254]">
              En yüksek harcamalı {insights.searchTerms.length} terim
            </p>
          </div>
          <div className="mt-4">
            <DataTable
              columns={[
                { key: "term", label: "Terim" },
                { key: "spend", label: "Harcama", align: "right" },
                { key: "clicks", label: "Tık", align: "right" },
                { key: "conversions", label: "Conv.", align: "right" },
              ]}
              rows={insights.searchTerms.map((row) => ({
                term: row.term,
                spend: row.spend,
                clicks: row.clicks,
                conversions: row.conversions,
              }))}
              empty="Arama terimi verisi yok."
            />
          </div>
        </article>

        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-semibold text-[#123524]">
              Landing page
            </h3>
            <p className="mt-1 text-xs text-[#466254]">
              En çok harcama yapılan URL&apos;ler
            </p>
          </div>
          <div className="mt-4">
            <DataTable
              columns={[
                { key: "url", label: "URL" },
                { key: "spend", label: "Harcama", align: "right" },
                { key: "clicks", label: "Tık", align: "right" },
                { key: "conversions", label: "Conv.", align: "right" },
              ]}
              rows={insights.landingPages.map((row) => ({
                url: row.url.replace(/^https?:\/\//, ""),
                spend: row.spend,
                clicks: row.clicks,
                conversions: row.conversions,
              }))}
              empty="Landing page verisi yok."
            />
          </div>
        </article>
      </div>
    </section>
  );
}
