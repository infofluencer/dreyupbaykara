"use client";

import type { GoogleMarketingInsights } from "@/lib/marketing/admin-stats";
import { formatPct, formatTry } from "@/lib/marketing/format";

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#f7f9f8] px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#466254]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[#123524]">
        {value}
      </p>
    </div>
  );
}

function BarList({
  rows,
  labelKey,
  valueKey,
}: {
  rows: Array<Record<string, string | number>>;
  labelKey: string;
  valueKey: string;
}) {
  if (!rows.length) {
    return (
      <p className="py-4 text-sm text-[#466254]">
        Veri yok — sync sonrası dolar (Google hesap gerekli).
      </p>
    );
  }
  const max = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 1);
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const pct = Math.round((Number(row[valueKey]) / max) * 100);
        return (
          <div key={String(row[labelKey])}>
            <div className="mb-1 flex justify-between gap-2 text-xs">
              <span className="truncate font-medium text-[#123524]">
                {String(row[labelKey])}
              </span>
              <span className="shrink-0 tabular-nums text-[#466254]">
                {valueKey === "spend"
                  ? formatTry(Number(row[valueKey]))
                  : Number(row[valueKey]).toLocaleString("tr-TR")}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#eef2f0]">
              <div
                className="h-full rounded-full bg-[#1a56db]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MarketingGoogleInsightsPanel({
  insights,
}: {
  insights: GoogleMarketingInsights | null;
}) {
  if (!insights) return null;

  const hasData =
    insights.devices.length ||
    insights.searchTerms.length ||
    insights.avgCtr != null;

  if (!hasData) {
    return (
      <section className="rounded-2xl border border-dashed border-[#123524]/15 bg-white p-5">
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
          Google Ads detay
        </h2>
        <p className="mt-2 text-sm text-[#466254]">
          CTR, cihaz, arama terimi ve landing page verileri için{" "}
          <strong>Veriyi şimdi çek (sync)</strong> çalıştırın. Migration{" "}
          <code>20260902180000_marketing_google_extended.sql</code> uygulanmış
          olmalı.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-instrument-sans)] text-lg font-semibold">
          Google Ads detay
        </h2>
        <p className="mt-1 text-sm text-[#466254]">
          API&apos;den sync edilen genişletilmiş metrikler (son sync penceresi).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Ort. CTR"
          value={insights.avgCtr != null ? formatPct(insights.avgCtr) : "—"}
        />
        <MetricCard
          label="Ort. CPC"
          value={insights.avgCpc != null ? formatTry(insights.avgCpc) : "—"}
        />
        <MetricCard
          label="Google CPA"
          value={
            insights.googleCostPerConversion != null
              ? formatTry(insights.googleCostPerConversion)
              : "—"
          }
        />
        <MetricCard
          label="Gösterim payı"
          value={
            insights.avgImpressionShare != null
              ? formatPct(insights.avgImpressionShare)
              : "—"
          }
        />
        <MetricCard
          label="Bütçe kaybı"
          value={
            insights.budgetLostShare != null
              ? formatPct(insights.budgetLostShare)
              : "—"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4">
          <h3 className="text-sm font-semibold text-[#123524]">Cihaz</h3>
          <div className="mt-3">
            <BarList rows={insights.devices} labelKey="device" valueKey="spend" />
          </div>
        </article>
        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4">
          <h3 className="text-sm font-semibold text-[#123524]">
            Dönüşüm aksiyonları
          </h3>
          <div className="mt-3">
            <BarList
              rows={insights.conversionActions}
              labelKey="name"
              valueKey="conversions"
            />
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4">
          <h3 className="text-sm font-semibold text-[#123524]">
            Top arama terimleri
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[#466254]">
                  <th className="pb-2 pr-3">Terim</th>
                  <th className="pb-2 pr-3">Harcama</th>
                  <th className="pb-2 pr-3">Tık</th>
                  <th className="pb-2">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {insights.searchTerms.map((row) => (
                  <tr key={row.term} className="border-t border-[#123524]/06">
                    <td className="max-w-[12rem] truncate py-2 pr-3 font-medium text-[#123524]">
                      {row.term}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{formatTry(row.spend)}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.clicks}</td>
                    <td className="py-2 tabular-nums">{row.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="rounded-2xl border border-[#123524]/08 bg-white p-4">
          <h3 className="text-sm font-semibold text-[#123524]">Landing page</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[#466254]">
                  <th className="pb-2 pr-3">URL</th>
                  <th className="pb-2 pr-3">Harcama</th>
                  <th className="pb-2">Tık</th>
                </tr>
              </thead>
              <tbody>
                {insights.landingPages.map((row) => (
                  <tr key={row.url} className="border-t border-[#123524]/06">
                    <td className="max-w-[14rem] truncate py-2 pr-3 font-medium text-[#123524]">
                      {row.url.replace(/^https?:\/\//, "")}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{formatTry(row.spend)}</td>
                    <td className="py-2 tabular-nums">{row.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
